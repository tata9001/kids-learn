import { Baby, ClipboardList } from "lucide-react";

interface HomeProps {
  childName: string;
  onChild(): void;
  onParent(): void;
}

export function Home({ childName, onChild, onParent }: HomeProps) {
  return (
    <section className="homeScreen">
      <div>
        <p className="eyebrow">学习伙伴</p>
        <h1>{childName}，今天和伙伴一起开始吧</h1>
      </div>
      <div className="modeGrid">
        <button className="modeButton childMode" onClick={onChild}>
          <Baby aria-hidden="true" />
          <span>孩子模式</span>
        </button>
        <button className="modeButton parentMode" onClick={onParent}>
          <ClipboardList aria-hidden="true" />
          <span>家长模式</span>
        </button>
      </div>
    </section>
  );
}
