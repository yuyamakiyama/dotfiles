# Not deployed as a chezmoi target (literal-dot filename in the source root
# is ignored by chezmoi's source-state parser).
#
# Filters an Orca `.settings` object down to the curated subset that's safe
# to sync across machines via chezmoi. Drops machine-specific values, secrets,
# app-owned migration flags, and UI state.
#
# Usage (see README.md "Orca" section for the full export command):
#   jq '.settings' "<live orca-data.json>" | jq -f .orca-settings-exclude.jq

def excludedKeys: [
  "workspaceDir",
  "workspaceDirHistory",
  "telemetry",
  "opencodeSessionCookie",
  "opencodeWorkspaceId",
  "minimaxGroupId",
  "codexManagedAccounts",
  "activeCodexManagedAccountId",
  "activeCodexManagedAccountIdsByRuntime",
  "claudeManagedAccounts",
  "activeClaudeManagedAccountId",
  "activeRuntimeEnvironmentId",
  "mobileEmulatorDefaultDeviceUdid",
  "androidSdkPath",
  "mobilePairingCustomAddress",
  "mobilePairingCustomAddresses",
  "defaultRepoSelection",
  "defaultLinearTeamSelection",
  "githubProjects",
  "commitMessageAi",
  "floatingTerminalTrustedCwds",
  "devPluginPaths",
  "pluginConsents",
  "localBaseRefSuggestionDismissed",
  "openLinksInAppPreferencePrompted",
  "tabSwitchKeybindingSeed"
];

def isExcluded($k):
  (excludedKeys | index($k)) != null
  or ($k | test("(Defaulted|Migrated)"))
  # Fail safe: a credential-shaped key added by a future Orca release is
  # dropped by default rather than synced until someone notices.
  or ($k | test("(?i)token|secret|cookie|credential|password|apikey"));

with_entries(select(isExcluded(.key) | not))
