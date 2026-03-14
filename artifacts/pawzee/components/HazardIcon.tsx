import React from "react";
import { View } from "react-native";
import { MaterialCommunityIcons, Ionicons, MaterialIcons } from "@expo/vector-icons";
import { HAZARD_CONFIGS, type HazardCategory } from "@/lib/hazards";
import styles from "./componentStyleSheets/HazardIconStyleSheet";

type MCIName = React.ComponentProps<typeof MaterialCommunityIcons>["name"];
type IonName = React.ComponentProps<typeof Ionicons>["name"];
type MIName = React.ComponentProps<typeof MaterialIcons>["name"];

interface HazardIconProps {
  category: HazardCategory;
  size?: number;
}

export function HazardIcon({ category, size = 32 }: HazardIconProps) {
  const config = HAZARD_CONFIGS[category] || HAZARD_CONFIGS.other;
  const iconSize = size * 0.55;

  const renderIcon = () => {
    const props = { size: iconSize, color: config.color };
    switch (config.iconFamily) {
      case "MaterialCommunityIcons":
        return <MaterialCommunityIcons name={config.iconName as MCIName} {...props} />;
      case "Ionicons":
        return <Ionicons name={config.iconName as IonName} {...props} />;
      case "MaterialIcons":
        return <MaterialIcons name={config.iconName as MIName} {...props} />;
      default:
        return <MaterialIcons name="warning" {...props} />;
    }
  };

  return (
    <View
      style={[
        styles.container,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: config.bgColor,
          borderColor: config.color,
        },
      ]}
    >
      {renderIcon()}
    </View>
  );
}
