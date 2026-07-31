import React from "react";
import { SettingDefinition } from "../../types/settingsRegistry";
import { colors, fonts, radii } from "../theme/theme";

interface SettingsFieldProps {
  definition: SettingDefinition;
  value: any;
  onChange: (value: any) => void;
}


export const SettingsField: React.FC<SettingsFieldProps> = ({ definition, value, onChange }) => {
  const inputStyle: React.CSSProperties = {
    padding: "0.45rem 0.6rem",
    backgroundColor: colors.bgManuscript,
    border: `1px solid ${colors.borderSubtle}`,
    borderRadius: radii.sm,
    color: colors.textPrimary,
    fontFamily: fonts.body,
    fontSize: "0.85rem",
    outline: "none",
    minWidth: "200px",
  };

  const renderControl = () => {
    switch (definition.type) {
      case "boolean":
        return (
          <label style={{ display: "flex", alignItems: "center", cursor: "pointer" }}>
            <input
              type="checkbox"
              checked={Boolean(value)}
              onChange={(e) => onChange(e.target.checked)}
            />
          </label>
        );

      case "select":
        return (
          <select value={value} onChange={(e) => onChange(e.target.value)} style={inputStyle}>
            {(definition.options ?? []).map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        );

      case "number":
        return (
          <input
            type="number"
            value={value}
            min={definition.min}
            max={definition.max}
            onChange={(e) => onChange(Number(e.target.value))}
            style={{ ...inputStyle, minWidth: "100px" }}
          />
        );

      case "text":
      default:
        return (
          <input
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            style={inputStyle}
          />
        );

      case "color":
        return (
          <input
            type="color"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            style={{
              width: "48px",
              height: "32px",
              padding: "2px",
              border: `1px solid ${colors.borderSubtle}`,
              borderRadius: radii.sm,
              cursor: "pointer",
              backgroundColor: colors.bgManuscript,
            }}
          />
        );
    }
  };

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: "1.5rem",
        padding: "0.85rem 0",
        borderBottom: `1px solid ${colors.borderSubtle}`,
      }}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontFamily: fonts.body, fontWeight: 600, fontSize: "0.9rem", color: colors.textPrimary }}>
          {definition.label}
        </div>
        {definition.description && (
          <div style={{ fontSize: "0.78rem", color: colors.textFaint, marginTop: "0.2rem" }}>
            {definition.description}
          </div>
        )}
      </div>
      <div style={{ flexShrink: 0 }}>{renderControl()}</div>
    </div>
  );
};