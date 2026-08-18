import React from "react";
import { colors, fonts, radii } from "../theme/theme";
import { SettingOption } from "../../types/settingsRegistry";

const baseInputStyle: React.CSSProperties = {
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

export interface BooleanSettingInputProps {
  value: boolean;
  onChange: (value: boolean) => void;
}

export const BooleanSettingInput: React.FC<BooleanSettingInputProps> = ({ value, onChange }) => (
  <label style={{ display: "flex", alignItems: "center", cursor: "pointer" }}>
    <input type="checkbox" checked={value} onChange={(e) => onChange(e.target.checked)} />
  </label>
);

export interface SelectSettingInputProps {
  value: string;
  options: SettingOption[];
  onChange: (value: string) => void;
}

export const SelectSettingInput: React.FC<SelectSettingInputProps> = ({
  value,
  options,
  onChange,
}) => (
  <select value={value} onChange={(e) => onChange(e.target.value)} style={baseInputStyle}>
    {options.map((opt) => (
      <option key={opt.value} value={opt.value}>
        {opt.label}
      </option>
    ))}
  </select>
);

export interface NumberSettingInputProps {
  value: number;
  min?: number;
  max?: number;
  onChange: (value: number) => void;
}

export const NumberSettingInput: React.FC<NumberSettingInputProps> = ({
  value,
  min,
  max,
  onChange,
}) => (
  <input
    type="number"
    value={value}
    min={min}
    max={max}
    onChange={(e) => onChange(Number(e.target.value))}
    style={{ ...baseInputStyle, minWidth: "100px" }}
  />
);

export interface TextSettingInputProps {
  value: string;
  onChange: (value: string) => void;
}

export const TextSettingInput: React.FC<TextSettingInputProps> = ({ value, onChange }) => (
  <input
    type="text"
    value={value}
    onChange={(e) => onChange(e.target.value)}
    style={baseInputStyle}
  />
);

export interface ColorSettingInputProps {
  value: string;
  onChange: (value: string) => void;
}

export const ColorSettingInput: React.FC<ColorSettingInputProps> = ({ value, onChange }) => (
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
