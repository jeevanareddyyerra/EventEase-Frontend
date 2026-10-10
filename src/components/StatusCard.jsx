/**
 * StatusCard displays key runtime and foundation configuration details.
 *
 * @param {{
 *   title: string,
 *   items: Array<{ label: string, value: string, badge?: string }>
 * }} props
 */
export default function StatusCard({ title, items }) {
  return (
    <div className="status-card">
      <h3 className="status-card-title">{title}</h3>
      <ul className="status-list">
        {items.map((item) => (
          <li key={item.label} className="status-item">
            <span className="status-label">{item.label}</span>
            <div className="status-value-group">
              <code className="status-code">{item.value}</code>
              {item.badge && <span className="badge badge-success">{item.badge}</span>}
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
