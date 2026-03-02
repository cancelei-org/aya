#!/bin/bash
# SuperClaude Rapid Prototyping Mode
# Quick MVP development

echo "🚀 SuperClaude Rapid Prototyping Mode Activated"
echo ""
echo "Prototyping approach:"
echo "- MVP-first implementation"
echo "- Minimal viable features only"
echo "- Quick iterations"
echo "- Functional over perfect"
echo "- Fast feedback loops"
echo ""
echo "I will:"
echo "• Build core functionality first"
echo "• Skip non-essential features"
echo "• Use simple, working solutions"
echo "• Prioritize speed to demo"
echo "• Iterate based on feedback"
echo ""
echo "Ready for rapid prototyping. What's the MVP?"

# Update mode in superclaude.json
jq '.modes.current = "rapid_prototyping"' .claude/superclaude.json > .claude/superclaude.json.tmp && mv .claude/superclaude.json.tmp .claude/superclaude.json