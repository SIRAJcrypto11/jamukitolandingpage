import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Sparkles, Loader2, Lightbulb, Target } from 'lucide-react';
import { toast } from 'sonner';

/**
 * ReviewAIHelper - AI-powered review assistance
 * - Auto-suggest templates based on role/department
 * - Pre-fill reviews from KPI data
 * - Generate development plans
 */
export default function ReviewAIHelper({ employee, kpiData, onApplySuggestion }) {
  const [suggestions, setSuggestions] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [developmentPlan, setDevelopmentPlan] = useState(null);

  const generateReviewSuggestions = async () => {
    try {
      setIsGenerating(true);

      const kpiInfo = kpiData ? `
KPI Data:
- Overall Score: ${kpiData.overall_score}/100
- Rating: ${kpiData.rating}
- Metrics: ${kpiData.metrics?.map(m => `${m.name}: ${m.actual}/${m.target} (${((m.actual/m.target)*100).toFixed(1)}%)`).join(', ')}
` : 'No KPI data available';

      const prompt = `Anda adalah HR expert. Generate performance review suggestions untuk karyawan berikut:

**Employee Info:**
- Nama: ${employee.user_name}
- Position: ${employee.position}
- Department: ${employee.department}
- Role: ${employee.role}

${kpiInfo}

Berdasarkan data ini, generate:

1. **Competency Scores** (1-5) untuk:
   - Communication
   - Teamwork
   - Problem Solving
   - Initiative
   - Leadership (jika applicable)
   - Technical Skills

2. **Strengths** (3-5 poin spesifik)

3. **Areas for Improvement** (3-5 poin spesifik)

4. **Overall Rating** (outstanding/exceeds_expectations/meets_expectations/needs_improvement/unsatisfactory)

5. **Reviewer Comments** (paragraph yang comprehensive dan constructive)

Output dalam JSON format dengan struktur:
{
  "competencies": [{"competency_name": "Communication", "score": 4, "comments": "..."}],
  "strengths": ["...", "..."],
  "areas_for_improvement": ["...", "..."],
  "rating": "exceeds_expectations",
  "reviewer_comments": "...",
  "overall_score": 85
}`;

      const response = await base44.integrations.Core.InvokeLLM({
        prompt: prompt,
        add_context_from_internet: false,
        response_json_schema: {
          type: 'object',
          properties: {
            competencies: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  competency_name: { type: 'string' },
                  score: { type: 'number' },
                  comments: { type: 'string' }
                }
              }
            },
            strengths: { type: 'array', items: { type: 'string' } },
            areas_for_improvement: { type: 'array', items: { type: 'string' } },
            rating: { type: 'string' },
            reviewer_comments: { type: 'string' },
            overall_score: { type: 'number' }
          }
        }
      });

      setSuggestions(response);
      toast.success('✅ AI suggestions generated!');

    } catch (error) {
      console.error('Error generating suggestions:', error);
      toast.error('Gagal generate suggestions');
    } finally {
      setIsGenerating(false);
    }
  };

  const generateDevelopmentPlan = async () => {
    try {
      setIsGenerating(true);

      const areasToImprove = suggestions?.areas_for_improvement || [];
      
      const prompt = `Generate a comprehensive development plan untuk ${employee.user_name} (${employee.position}) untuk meningkatkan performa.

Areas yang perlu improvement:
${areasToImprove.map((a, i) => `${i+1}. ${a}`).join('\n')}

Generate development plan dengan format JSON:
{
  "development_plan": [
    {
      "goal": "Specific improvement goal",
      "action": "Concrete action steps",
      "timeline": "Timeline to achieve (e.g., 3 months)",
      "support_needed": "Resources/training needed"
    }
  ]
}

Buat 3-5 development goals yang SMART (Specific, Measurable, Achievable, Relevant, Time-bound).`;

      const response = await base44.integrations.Core.InvokeLLM({
        prompt: prompt,
        add_context_from_internet: false,
        response_json_schema: {
          type: 'object',
          properties: {
            development_plan: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  goal: { type: 'string' },
                  action: { type: 'string' },
                  timeline: { type: 'string' },
                  support_needed: { type: 'string' }
                }
              }
            }
          }
        }
      });

      setDevelopmentPlan(response.development_plan);
      toast.success('✅ Development plan generated!');

    } catch (error) {
      console.error('Error generating development plan:', error);
      toast.error('Gagal generate development plan');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="space-y-4">
      <Card className="bg-gradient-to-br from-purple-900/20 to-blue-900/20 border-purple-700">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-purple-400" />
            AI Review Assistant
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-3">
            <Button
              onClick={generateReviewSuggestions}
              disabled={isGenerating}
              className="flex-1 bg-purple-600 hover:bg-purple-700"
            >
              {isGenerating ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Generating...</>
              ) : (
                <><Sparkles className="w-4 h-4 mr-2" /> Auto-Generate Review</>
              )}
            </Button>

            {suggestions && (
              <Button
                onClick={generateDevelopmentPlan}
                disabled={isGenerating}
                variant="outline"
                className="border-blue-600 text-blue-400"
              >
                <Target className="w-4 h-4 mr-2" />
                Development Plan
              </Button>
            )}
          </div>

          {/* AI Suggestions */}
          {suggestions && (
            <div className="space-y-3">
              <div className="bg-gray-800 p-4 rounded-lg border border-purple-700">
                <div className="flex items-center justify-between mb-3">
                  <p className="font-semibold text-white">AI-Generated Review</p>
                  <Badge className="bg-purple-600">
                    Score: {suggestions.overall_score}/100
                  </Badge>
                </div>

                {/* Competencies */}
                <div className="mb-4">
                  <p className="text-sm font-semibold text-gray-400 mb-2">Competencies:</p>
                  <div className="grid grid-cols-2 gap-2">
                    {suggestions.competencies?.map((comp, idx) => (
                      <div key={idx} className="bg-gray-900 p-2 rounded">
                        <p className="text-xs text-gray-300">{comp.competency_name}</p>
                        <p className="text-lg font-bold text-white">{comp.score}/5</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Strengths */}
                {suggestions.strengths && suggestions.strengths.length > 0 && (
                  <div className="mb-4">
                    <p className="text-sm font-semibold text-green-400 mb-2">Strengths:</p>
                    <ul className="text-sm text-gray-300 space-y-1">
                      {suggestions.strengths.map((s, i) => (
                        <li key={i}>✓ {s}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Areas for Improvement */}
                {suggestions.areas_for_improvement && suggestions.areas_for_improvement.length > 0 && (
                  <div className="mb-4">
                    <p className="text-sm font-semibold text-yellow-400 mb-2">Areas to Improve:</p>
                    <ul className="text-sm text-gray-300 space-y-1">
                      {suggestions.areas_for_improvement.map((a, i) => (
                        <li key={i}>→ {a}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Comments */}
                <div className="bg-gray-900 p-3 rounded border border-gray-700">
                  <p className="text-xs text-gray-400 mb-1">Reviewer Comments:</p>
                  <p className="text-sm text-gray-200">{suggestions.reviewer_comments}</p>
                </div>

                <Button
                  onClick={() => onApplySuggestion(suggestions)}
                  className="w-full mt-3 bg-green-600 hover:bg-green-700"
                >
                  Apply AI Suggestions to Review
                </Button>
              </div>
            </div>
          )}

          {/* Development Plan */}
          {developmentPlan && developmentPlan.length > 0 && (
            <div className="bg-gray-800 p-4 rounded-lg border border-blue-700">
              <div className="flex items-center gap-2 mb-3">
                <Lightbulb className="w-5 h-5 text-yellow-400" />
                <p className="font-semibold text-white">AI-Generated Development Plan</p>
              </div>

              <div className="space-y-3">
                {developmentPlan.map((plan, idx) => (
                  <div key={idx} className="bg-gray-900 p-3 rounded border border-gray-700">
                    <div className="flex items-start gap-2 mb-2">
                      <Badge className="bg-blue-600">{idx + 1}</Badge>
                      <div className="flex-1">
                        <p className="font-semibold text-white mb-1">{plan.goal}</p>
                        <div className="text-sm text-gray-300 space-y-1">
                          <p><span className="text-gray-400">Action:</span> {plan.action}</p>
                          <p><span className="text-gray-400">Timeline:</span> {plan.timeline}</p>
                          <p><span className="text-gray-400">Support Needed:</span> {plan.support_needed}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <Button
                onClick={() => onApplySuggestion({ development_plan: developmentPlan })}
                className="w-full mt-3 bg-blue-600 hover:bg-blue-700"
              >
                Apply Development Plan
              </Button>
            </div>
          )}

          {!suggestions && !isGenerating && (
            <div className="text-center py-8 text-gray-400">
              <Sparkles className="w-12 h-12 mx-auto mb-3 text-purple-500" />
              <p>Click "Auto-Generate Review" untuk AI suggestions</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}