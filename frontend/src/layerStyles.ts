// Shared by the rendered overlays and the dynamic legend.
export function contextLayerStyle(id: string) {
  const color =
    id === "hydrants"
      ? "#b56748"
      : id.includes("flood") || id === "waterways"
        ? "#267cba"
        : id.includes("weather")
          ? "#7a65a9"
          : id.includes("fire")
            ? "#c37841"
            : id.includes("access") || id === "building-entrances"
              ? "#397b75"
              : "#4e7c82";
  return {
    color,
    radius: id.includes("hazards") ? 23 : id === "hydrants" ? 7 : 10,
    weight: id === "closures" || id === "waterways" ? 5 : 2,
  };
}
