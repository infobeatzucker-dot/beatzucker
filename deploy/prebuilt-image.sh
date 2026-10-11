#!/bin/bash
# Sourced by deploy.sh. Only deployment tooling/docs may differ from image source.
check_prebuilt_source() {
  local image="$1" revision changed path
  if [[ ! "$image" =~ ^beatzucker:release-([0-9a-f]{7,40})$ ]]; then
    echo "FATAL: expected beatzucker:release-<git revision>."
    return 1
  fi
  revision="${BASH_REMATCH[1]}"
  git rev-parse --verify "${revision}^{commit}" >/dev/null 2>&1 || return 1
  git merge-base --is-ancestor "$revision" HEAD || return 1
  changed=$(git diff --name-only "$revision" HEAD) || return 1
  while IFS= read -r path; do
    case "$path" in
      ""|deploy/*|AUDIT-IMPLEMENTATION-2026-10-11.md|scripts/prebuilt-deploy-tests.cjs|scripts/run-audit-tests.cjs) ;;
      *) echo "FATAL: $path differs from prebuilt image source; rebuild required."; return 1 ;;
    esac
  done <<< "$changed"
  echo "Prebuilt application source matches revision $revision."
}
