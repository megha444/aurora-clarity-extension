from pydantic import BaseModel
from typing import List


class AnalyzeRequest(BaseModel):
    url: str
    page_text: str


class DetectedPattern(BaseModel):
    pattern_type: str
    severity: str
    matched_text: str
    context: str
    human_message: str
    why_it_matters: str
    confidence: float
    score_contribution: int


class AnalyzeResponse(BaseModel):
    url: str
    patterns: List[DetectedPattern]
    overall_manipulation_score: int
    summary: str
    ai_enhanced: bool
