type SwitchProps = {
  checked: boolean
  onChange: (value: boolean) => void
}

export function Switch({ checked, onChange }: SwitchProps) {
  return (
    <label style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
      <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} />
      <span>{checked ? 'Ativado' : 'Desativado'}</span>
    </label>
  )
}
