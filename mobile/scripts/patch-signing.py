#!/usr/bin/env python3
import os
import sys
from pathlib import Path

ks = sys.argv[1] if len(sys.argv) > 1 else ""
pwd = sys.argv[2] if len(sys.argv) > 2 else "SkillectRelease2026!"
alias = sys.argv[3] if len(sys.argv) > 3 else "skillect"
kpwd = sys.argv[4] if len(sys.argv) > 4 else pwd

p = Path("android/app/build.gradle")
if not p.exists():
    p = Path("mobile/android/app/build.gradle")
t = p.read_text()

if ks and Path(ks).exists():
    release_cfg = f'''
        release {{
            storeFile file("{ks}")
            storePassword "{pwd}"
            keyAlias "{alias}"
            keyPassword "{kpwd}"
        }}
'''
    if "keyAlias" not in t:
        if "signingConfigs {" in t:
            t = t.replace("signingConfigs {", "signingConfigs {" + release_cfg, 1)
        else:
            t = t.replace(
                "buildTypes {",
                "signingConfigs {\n" + release_cfg + "    }\n    buildTypes {",
                1,
            )
    t = t.replace("signingConfig signingConfigs.debug", "signingConfig signingConfigs.release")
    if "release {" in t and "signingConfig signingConfigs.release" not in t.split("release {")[1][:500]:
        t = t.replace("release {", "release {\n            signingConfig signingConfigs.release", 1)
    p.write_text(t)
    print("signing patched with", ks)
else:
    print("no keystore; left default signing")
