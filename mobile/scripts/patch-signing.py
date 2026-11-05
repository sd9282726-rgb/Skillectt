#!/usr/bin/env python3
"""Patch Expo-generated android/app/build.gradle for release signing."""
import re
import sys
from pathlib import Path

ks = sys.argv[1] if len(sys.argv) > 1 else ""
pwd = sys.argv[2] if len(sys.argv) > 2 else "SkillectRelease2026!"
alias = sys.argv[3] if len(sys.argv) > 3 else "skillect"
kpwd = sys.argv[4] if len(sys.argv) > 4 else pwd

candidates = [
    Path("mobile/android/app/build.gradle"),
    Path("android/app/build.gradle"),
]
p = next((c for c in candidates if c.exists()), None)
if p is None:
    print("ERROR: build.gradle not found")
    sys.exit(1)

t = p.read_text()
print(f"patching {p}")

if not ks or not Path(ks).exists():
    print("no keystore file; leaving default debug signing")
    # Ensure we do NOT reference missing release config
    t = t.replace("signingConfig signingConfigs.release", "signingConfig signingConfigs.debug")
    p.write_text(t)
    sys.exit(0)

# Remove any broken partial release blocks we may have inserted before
t = re.sub(
    r"release\s*\{\s*storeFile.*?keyPassword\s*\"[^\"]*\"\s*\}",
    "",
    t,
    flags=re.S,
)

signing_block = f'''
    signingConfigs {{
        debug {{
            storeFile file('debug.keystore')
            storePassword 'android'
            keyAlias 'androiddebugkey'
            keyPassword 'android'
        }}
        release {{
            storeFile file("{ks}")
            storePassword "{pwd}"
            keyAlias "{alias}"
            keyPassword "{kpwd}"
        }}
    }}
'''

# Replace existing signingConfigs block if present
if re.search(r"signingConfigs\s*\{", t):
    t = re.sub(r"signingConfigs\s*\{.*?\n    \}", signing_block.strip(), t, count=1, flags=re.S)
else:
    t = t.replace("buildTypes {", signing_block + "\n    buildTypes {", 1)

# Force release buildType to use release signing
t = re.sub(
    r"(release\s*\{)",
    r"\1\n            signingConfig signingConfigs.release",
    t,
    count=1,
)
# Avoid duplicate signingConfig lines inside release
# Collapse double inserts
while "signingConfig signingConfigs.release\n            signingConfig signingConfigs.release" in t:
    t = t.replace(
        "signingConfig signingConfigs.release\n            signingConfig signingConfigs.release",
        "signingConfig signingConfigs.release",
    )

# debug may still say debug — fine
t = t.replace(
    "signingConfig signingConfigs.debug",
    "signingConfig signingConfigs.debug",
)

p.write_text(t)
print("signing patched OK")
print(p.read_text()[max(0, t.find("signingConfigs") - 20) : t.find("signingConfigs") + 400] if "signingConfigs" in t else "")
