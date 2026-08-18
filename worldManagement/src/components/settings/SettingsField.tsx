import React from "react";
import { SettingDefinition } from "../../types/settingsRegistry";
import { colors, fonts } from "../theme/theme";
import {
  BooleanSettingInput,
  SelectSettingInput,
  NumberSettingInput,
  TextSettingInput,
  ColorSettingInput,
} from "./SettingInputs";

interface SettingsFieldProps {
  definition: SettingDefinition;
  value: boolean | number | string | unknown;
  onChange: (value: boolean | number | string) => void;
}

export const SettingsField: React.FC<SettingsFieldProps> = ({ definition, value, onChange }) => {
  const renderControl = () => {
    switch (definition.type) {
      case "boolean":
        return <BooleanSettingInput value={Boolean(value)} onChange={onChange} />;

      case "select":
        return (
          <SelectSettingInput
            value={String(value)}
            options={definition.options ?? []}
            onChange={onChange}
          />
        );

      case "number":
        return (
          <NumberSettingInput
            value={Number(value)}
            min={definition.min}
            max={definition.max}
            onChange={onChange}
          />
        );

      case "color":
        return <ColorSettingInput value={String(value)} onChange={onChange} />;

      case "text":
      default:
        return <TextSettingInput value={String(value)} onChange={onChange} />;
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
        <div
          style={{
            fontFamily: fonts.body,
            fontWeight: 600,
            fontSize: "0.9rem",
            color: colors.textPrimary,
          }}
        >
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
