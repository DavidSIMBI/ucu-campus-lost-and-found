const iconByCategory = { Keys: '⌘', Electronics: '▣', Accessories: '◇', Books: '▤', Clothing: '◒' };

export default function ItemCard({ item }) {
  const reportType = item.report_type ?? item.type?.toUpperCase();
  const displayType = reportType === 'LOST' ? 'Lost' : reportType === 'FOUND' ? 'Found' : 'Report';
  const rawDate = item.event_date ?? item.date;
  const date = /^\d{4}-\d{2}-\d{2}$/.test(rawDate ?? '')
    ? new Intl.DateTimeFormat(undefined, { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(`${rawDate}T00:00:00`))
    : rawDate;
  const status = item.status?.toUpperCase();

  return (
    <article className="item-card">
      <div className={`item-art art-${item.tone ?? 'green'}`}>
        {item.image && <img src={item.image} alt={item.title} onError={(event) => event.currentTarget.parentElement.classList.add('item-art-fallback')} />}
        <span aria-hidden="true">{iconByCategory[item.category] ?? '◈'}</span>
      </div>
      <div className="item-details">
        <div className="item-topline">
          <span className={`status status-${reportType?.toLowerCase()}`}>{displayType}</span>
          <time dateTime={item.event_date}>{date}</time>
        </div>
        <h3>{item.title}</h3>
        <p className="item-location"><span aria-hidden="true">⌖</span> {item.location}</p>
        {item.description && <p className="item-description">{item.description}</p>}
        {status === 'OPEN' && <span className="item-status item-status-open">Open</span>}
        {status === 'RETURNED' && <span className="item-status item-status-returned">Returned</span>}
        {status === 'CLOSED' && <span className="item-status item-status-closed">Closed</span>}
        <span className="category">{item.category}</span>
      </div>
    </article>
  );
}
