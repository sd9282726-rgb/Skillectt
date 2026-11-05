#!/usr/bin/env python3
from pathlib import Path

root = Path("mobile/android")
if not root.exists():
    root = Path("android")

# gradle.properties
gp = root / "gradle.properties"
extra = """
android.kotlinVersion=1.9.25
kotlin.version=1.9.25
android.suppressKotlinVersionCompatibilityCheck=true
"""
if gp.exists():
    t = gp.read_text()
    if "android.kotlinVersion" not in t:
        gp.write_text(t.rstrip() + "\n" + extra)
    else:
        t = t.replace("1.9.24", "1.9.25")
        gp.write_text(t)

# root build.gradle
b = root / "build.gradle"
if b.exists():
    t = b.read_text()
    t = t.replace("1.9.24", "1.9.25")
    # inject subprojects suppress block once
    block = '''
subprojects { sub ->
  sub.afterEvaluate {
    tasks.withType(org.jetbrains.kotlin.gradle.tasks.KotlinCompile).configureEach {
      kotlinOptions {
        freeCompilerArgs += [
          "-P",
          "plugin:androidx.compose.compiler.plugins.kotlin:suppressKotlinVersionCompatibilityCheck=true"
        ]
      }
    }
  }
}
'''
    if "suppressKotlinVersionCompatibilityCheck" not in t:
        t = t + "\n" + block
    b.write_text(t)
    print("patched", b)

print("done")
