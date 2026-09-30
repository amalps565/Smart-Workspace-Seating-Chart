const ITEMS = [
  { className: 'cell--available', icon: '○', text: 'Free' },
  { className: 'cell--mine', icon: '★', text: 'Your desk' },
  { className: 'cell--booked', icon: '●', text: 'Booked' },
  { className: 'cell--blocked_by_spacing', icon: '⊘', text: 'Too close to a booked desk' },
]

export function Legend() {
  return (
    <ul className="legend" aria-label="Legend">
      {ITEMS.map((item) => (
        <li key={item.className}>
          <span className={`legend__swatch cell ${item.className}`} aria-hidden="true">
            {item.icon}
          </span>
          {item.text}
        </li>
      ))}
    </ul>
  )
}
