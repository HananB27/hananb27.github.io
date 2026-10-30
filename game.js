/** Camera-relative movement, normalized so diagonal movement cannot run faster. */
export function movePlayer(position, horizontal, vertical, viewAngle, delta) {
  const magnitude = Math.hypot(horizontal, vertical);
  if (!magnitude) return null;
  const x = horizontal / magnitude,
    z = vertical / magnitude;
  const worldX = x * Math.cos(viewAngle) + z * Math.sin(viewAngle);
  const worldZ = -x * Math.sin(viewAngle) + z * Math.cos(viewAngle);
  const dt = Math.min(Math.max(delta, 0), 0.04);
  position.x += worldX * 3.4 * dt;
  position.z += worldZ * 3.4 * dt;
  const radius = Math.hypot(position.x, position.z);
  if (radius > 6.35) {
    position.x *= 6.35 / radius;
    position.z *= 6.35 / radius;
  }
  return Math.atan2(worldX, worldZ);
}
/** Returns only new discoveries; previously collected crystals cannot score twice. */
export function collectSkills(position, crystals) {
  return crystals.filter((crystal) => {
    if (crystal.collected) return false;
    if (
      Math.hypot(
        crystal.group.position.x - position.x,
        crystal.group.position.z - position.z,
      ) >= 0.7
    )
      return false;
    crystal.collected = true;
    crystal.group.visible = false;
    return true;
  });
}
