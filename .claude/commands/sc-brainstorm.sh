#!/bin/bash
# SuperClaude Brainstorming Mode
# Activates creative exploration and ideation mode

echo "🧠 SuperClaude Brainstorming Mode Activated"
echo ""
echo "Behavioral adjustments:"
echo "- Creative exploration enabled"
echo "- Constraint relaxation for ideation"
echo "- Multiple solution generation"
echo "- Lateral thinking patterns"
echo ""
echo "I'm now in brainstorming mode. I will:"
echo "1. Generate multiple creative solutions"
echo "2. Explore unconventional approaches"
echo "3. Consider edge cases and alternatives"
echo "4. Provide comprehensive option analysis"
echo ""
echo "What would you like to brainstorm about?"

# Update mode in superclaude.json
jq '.modes.current = "brainstorming"' .claude/superclaude.json > .claude/superclaude.json.tmp && mv .claude/superclaude.json.tmp .claude/superclaude.json