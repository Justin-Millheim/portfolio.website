export const metadata = {
  title: "Now — Justin Millheim",
  description: "A snapshot of what I am focused on right now.",
};

const rows: [string, string][] = [
  ["Working on", "My Adobe internship: Claude Skills, MCP tooling, and Customer Journey Analytics. And building this site in the open."],
  ["Reading", "Brandon Sanderson\u2019s Stormlight Archive. Again. No regrets."],
  ["Adventuring", "Chasing fresh DWR stocking reports along the Wasatch Front and planning the next camp-and-cast weekend."],
  ["Tinkering", "New laser-engraving gift ideas and a few more Claude Skills I have not shipped yet."],
];

export default function NowPage() {
  return (
    <section className="section" style={{ paddingTop: "clamp(48px,7vw,90px)" }}>
      <div className="wrap">
        <div className="eyebrow">A snapshot · updated monthly</div>
        <div className="sec-head" style={{ marginTop: 10 }}>
          <h2 className="serif">Now</h2>
          <div className="rule" />
        </div>
        <div className="nowpage">
          {rows.map(([k, v]) => (
            <div className="nowrow" key={k}>
              <div className="k">{k}</div>
              <div className="v">{v}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
