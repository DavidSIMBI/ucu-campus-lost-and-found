const iconByCategory = { Electronics: '▣', Accessories: '◇', Books: '▤', Clothing: '◒' };

export default function ItemCard({ item }) {
  return (
    <article className="item-card">
      <div className={`item-art art-${item.tone}`} aria-hidden="true"><span>{iconByCategory[item.category] ?? '◈'}</span></div>
      <div className="item-details">
        <div className="item-topline"><span className={`status status-${item.type.toLowerCase()}`}>{item.type}</span><span>{item.date}</span></div>
        <h3>{item.title}</h3>
        <p>{item.location}</p>
        <span className="category">{item.category}</span>
      </div>
    </article>
  );
}
