from fastapi import APIRouter
from app.models.schemas import AnalyzeRequest, AnalyzeResponse, DetectedPattern
from app.services.detector import DarkPatternDetector
from app.services.ai_service import rewrite_messages

router = APIRouter()
detector = DarkPatternDetector()


@router.post("/analyze", response_model=AnalyzeResponse)
async def analyze_page(request: AnalyzeRequest):
    findings = detector.detect(request.page_text)
    score = detector.compute_score(findings)
    label = detector.score_label(score)
    ai_enhanced = False

    patterns = [
        DetectedPattern(
            pattern_type=f["pattern_type"],
            severity=f["severity"],
            matched_text=f["matched_text"],
            context=f["context"],
            human_message=f["fallback_message"],
            why_it_matters=f["why_it_matters"],
            confidence=f["confidence"],
            score_contribution=f["score_contribution"],
        )
        for f in findings
    ]

    summary = f"{label}. {len(patterns)} signal(s) detected."

    if findings:
        ai_result = await rewrite_messages(request.url, findings)
        if ai_result:
            ai_enhanced = True
            rewrite_map = {r["pattern_type"]: r["human_message"] for r in ai_result.get("rewrites", [])}
            for p in patterns:
                if p.pattern_type in rewrite_map:
                    p.human_message = rewrite_map[p.pattern_type]
            summary = ai_result.get("overall_summary", summary)

    return AnalyzeResponse(
        url=request.url,
        patterns=patterns,
        overall_manipulation_score=score,
        summary=summary,
        ai_enhanced=ai_enhanced,
    )
