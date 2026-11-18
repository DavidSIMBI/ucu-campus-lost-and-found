const iconByCategory = { Electronics: '▣', Accessories: '◇', Books: '▤', Clothing: '◒' };

export default function ItemCard({ item }) {
  const type = item.report_type ?? item.type?.toUpperCase();
  const date = item.event_date ?? item.date;
  const formattedDate = /^\d{4}-\d{2}-\d{2}$/.test(date ?? '') ? new Date(`${date}T00:00:00`).toLocaleDateString() : date;
  const status = item.status?.toUpperCase();
  return (
    <article className="item-card">
      <div className={`item-art art-${item.tone}`} aria-hidden="true"><span>{iconByCategory[item.category] ?? '◈'}</span></div>
      <div className="item-details">
        <div className="item-topline"><span className={`status status-${type?.toLowerCase()}`}>{type}</span><span>{formattedDate}</span></div>
        <h3>{item.title}</h3>
        <p>{item.location}</p>
        {status === 'OPEN' && <span className="item-status item-status-open">⚠️ Open</span>}
        {status === 'RETURNED' && <span className="item-status item-status-returned">✅ Returned</span>}
        <span className="category">{item.category}</span>
      </div>
    </article>
  );
}
