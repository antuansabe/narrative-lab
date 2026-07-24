import { callClaudeWithCachedSystem } from "./anthropic";
import { CLASSIFIER_SYSTEM_PROMPT } from "./prompts/classifier";

export interface ClassifierOutput {
  paradigm1: { level: "absent" | "present" | "central"; justification: string };
  paradigm2: { level: "absent" | "present" | "central"; justification: string };
  paradigm3: { level: "absent" | "present" | "central"; justification: string };
  paradigm4: { level: "absent" | "present" | "central"; justification: string };
}

export function validateClassifierShape(parsed: any): parsed is ClassifierOutput {
  if (typeof parsed !== "object" || parsed === null) return false;
  const keys: Array<keyof ClassifierOutput> = ["paradigm1", "paradigm2", "paradigm3", "paradigm4"];
  for (const k of keys) {
    const item = parsed[k];
    if (typeof item !== "object" || item === null) return false;
    if (typeof item.justification !== "string") return false;
    if (item.level !== "absent" && item.level !== "present" && item.level !== "central") return false;
  }
  return true;
}

export async function runClassification(pieceText: string): Promise<ClassifierOutput> {
  const response = await callClaudeWithCachedSystem({
    model: "claude-sonnet-4-6",
    systemPrompt: CLASSIFIER_SYSTEM_PROMPT,
    userMessage: pieceText,
    maxTokens: 3000,
    temperature: 0,
  });

  let parsed: any;
  try {
    parsed = JSON.parse(response.text);
  } catch (err) {
    throw new Error(`Failed to parse classifier output as JSON: ${response.text}`);
  }

  if (!validateClassifierShape(parsed)) {
    throw new Error(`Classifier output does not conform to the expected schema: ${JSON.stringify(parsed)}`);
  }

  return parsed;
}
