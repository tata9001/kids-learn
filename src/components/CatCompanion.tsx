import type { CatStage } from "../domain/cats";
import { getCatDecoration } from "../domain/cats";

export function CatFigure({
  stage,
  level,
  size = "large",
  decorationId
}: {
  stage: CatStage;
  level?: number;
  size?: "large" | "small";
  decorationId?: string;
}) {
  const decoration = decorationId ? getCatDecoration(decorationId) : undefined;

  return (
    <div className={`catFigure cat-${stage.className} catFigure-${size}`} aria-hidden="true">
      <span className="catShadow" />
      <span className="catTail" />
      <span className="catBody">
        <span className="catChest" />
        <span className="catPaw catPawLeft" />
        <span className="catPaw catPawRight" />
      </span>
      <span className="catHead">
        <span className="catEar catEarLeft" />
        <span className="catEar catEarRight" />
        <span className="catInnerEar catInnerEarLeft" />
        <span className="catInnerEar catInnerEarRight" />
        <span className="catStripe catStripeLeft" />
        <span className="catStripe catStripeRight" />
        <span className="catEye catEyeLeft" />
        <span className="catEye catEyeRight" />
        <span className="catBlush catBlushLeft" />
        <span className="catBlush catBlushRight" />
        <span className="catNose" />
        <span className="catMouth" />
        <span className="catWhisker catWhiskerLeftA" />
        <span className="catWhisker catWhiskerLeftB" />
        <span className="catWhisker catWhiskerRightA" />
        <span className="catWhisker catWhiskerRightB" />
      </span>
      <span className="catAccessory" />
      {decoration && <span className={`catWearable catWearable-${decoration.className}`} />}
      {level && <span className="catBadge">{level}</span>}
    </div>
  );
}
