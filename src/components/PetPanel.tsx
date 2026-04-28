import type { PetState } from "../domain/types";

export function PetPanel({ pet }: { pet: PetState }) {
  return (
    <section className={`petPanel mood-${pet.mood}`} aria-label="宠物伙伴">
      <div className="petAvatar" aria-hidden="true">
        <span className="petFace">•ᴗ•</span>
      </div>
      <div>
        <h2>伙伴等级 {pet.level}</h2>
        <p>能量 {pet.energy} · 连续 {pet.streakDays} 天 · 照顾道具 {pet.careItems}</p>
      </div>
    </section>
  );
}
