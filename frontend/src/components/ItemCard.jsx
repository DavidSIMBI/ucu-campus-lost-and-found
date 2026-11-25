import { getReportPhotoUrl } from '../services/reportPhoto.js';
import { Link } from 'react-router-dom';

const iconByCategory = { Keys: '⌘', Electronics: '▣', Accessories: '◇', Books: '▤', Clothing: '◒' };

export default function ItemCard({ item }) {
  const photoUrl = item.photo_path ? getReportPhotoUrl(item.photo_path) : item.image;
  const reportType = item.report_type ?? item.type?.toUpperCase();
  const displayType = reportType === 'LOST' ? 'Lost' : reportType === 'FOUND' ? 'Found' : 'Report';
  const rawDate = item.event_date ?? item.date;
  const date = /^\d{4}-\d{2}-\d{2}$/.test(rawDate ?? '')
    ? new Intl.DateTimeFormat(undefined, { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(`${rawDate}T00:00:00`))
    : rawDate;
  const status = item.status?.toUpperCase();
  const detailsHref = `/items/${item.id}`;

  return (
    <article className="item-card">
      <div className={`item-art art-${item.tone ?? 'green'}${photoUrl ? '' : ' item-art-fallback'}`}>
        {photoUrl && <img src={photoUrl} alt={item.title} onError={(event) => event.currentTarget.parentElement.classList.add('item-art-fallback')} />}
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
        {status === 'OPEN' && <span className="item-status item-status-open">{reportType === 'FOUND' ? 'Available' : 'Still lost'}</span>}
        {status === 'RETURNED' && <span className="item-status item-status-returned">Returned</span>}
        {status === 'CLOSED' && <span className="item-status item-status-closed">Closed</span>}
        <span className="category">{item.category}</span>
        <Link className="item-card-action" to={detailsHref}>View Details <span aria-hidden="true">↗</span></Link>
      </div>
    </article>
  );
}
