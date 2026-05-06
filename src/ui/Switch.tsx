type SwitchProps = {
  checked: boolean
  onChange: (value: boolean) => void
}

export function Switch({ checked, onChange }: SwitchProps) {
  return (
    <label className="switch">
      <input
        className="switch-input"
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
      />
      <span className="switch-label">{checked ? 'Ativado' : 'Desativado'}</span>
    </label>
  )
}
