#!/usr/bin/env bash

set -uo pipefail

readonly DEFAULT_OUTPUT_FILE="/mnt/38tb/containers/arcane-codex-deploy.log"
readonly STACK_NAME="${PORTAINER_STACK_NAME:-${COMPOSE_PROJECT_NAME:-arcane-codex}}"
readonly OUTPUT_FILE="${1:-$DEFAULT_OUTPUT_FILE}"
readonly OUTPUT_DIRECTORY="$(dirname "$OUTPUT_FILE")"

if ! command -v docker >/dev/null 2>&1; then
  echo "Error: docker CLI is required." >&2
  exit 127
fi

if ! docker info >/dev/null 2>&1; then
  echo "Error: unable to connect to the Docker daemon." >&2
  exit 1
fi

mkdir -p "$OUTPUT_DIRECTORY" || {
  echo "Error: unable to create output directory: $OUTPUT_DIRECTORY" >&2
  exit 1
}

mapfile -t container_ids < <(
  docker ps --all --quiet \
    --filter "label=com.docker.compose.project=$STACK_NAME"
)

if (( ${#container_ids[@]} == 0 )); then
  echo "Error: no containers found for Portainer/Compose stack '$STACK_NAME'." >&2
  echo "Set PORTAINER_STACK_NAME to the project name shown in Portainer and retry." >&2
  exit 1
fi

temporary_file="$(mktemp "$OUTPUT_DIRECTORY/.arcane-codex-deploy.log.XXXXXX")" || exit 1
trap 'rm -f "$temporary_file"' EXIT

{
  printf 'Arcane Codex deployment logs\n'
  printf 'Stack: %s\n' "$STACK_NAME"
  printf 'Exported (UTC): %s\n' "$(date -u +'%Y-%m-%dT%H:%M:%SZ')"
  printf 'Containers: %s\n' "${#container_ids[@]}"

  export_failed=0
  for container_id in "${container_ids[@]}"; do
    container_name="$(docker inspect --format '{{.Name}}' "$container_id" 2>/dev/null)"
    service_name="$(docker inspect --format '{{index .Config.Labels "com.docker.compose.service"}}' "$container_id" 2>/dev/null)"
    container_name="${container_name#/}"

    printf '\n================================================================================\n'
    printf 'Container: %s (%s)\n' "${container_name:-unknown}" "$container_id"
    printf 'Service: %s\n' "${service_name:-unknown}"
    printf '================================================================================\n'

    # docker logs combines the application's stdout and stderr streams here.
    if ! docker logs --timestamps "$container_id" 2>&1; then
      printf '\n[log export failed for container %s]\n' "$container_id"
      export_failed=1
    fi
  done
} >"$temporary_file"

if ! mv "$temporary_file" "$OUTPUT_FILE"; then
  echo "Error: unable to save logs to $OUTPUT_FILE" >&2
  exit 1
fi
trap - EXIT

echo "Saved ${#container_ids[@]} container log(s) to $OUTPUT_FILE"
exit "$export_failed"
