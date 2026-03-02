#!/bin/bash
# SuperClaude Status Command
# Display current mode and configuration

echo "📊 SuperClaude Framework Status"
echo "================================"
echo ""

# Read current configuration
if [ -f .claude/superclaude.json ]; then
    CURRENT_MODE=$(jq -r '.modes.current' .claude/superclaude.json)
    AUTO_DISPATCH=$(jq -r '.agents.auto_dispatch' .claude/superclaude.json)
    VERSION=$(jq -r '.version' .claude/superclaude.json)
    
    echo "Version: $VERSION"
    echo "Current Mode: $CURRENT_MODE"
    echo "Agent Auto-Dispatch: $AUTO_DISPATCH"
    echo ""
    
    echo "Available Modes:"
    jq -r '.modes.available[]' .claude/superclaude.json | while read mode; do
        if [ "$mode" = "$CURRENT_MODE" ]; then
            echo "  • $mode [ACTIVE]"
        else
            echo "  • $mode"
        fi
    done
    echo ""
    
    echo "Features Status:"
    echo "  • Agents: $(jq -r '.features.agents' .claude/superclaude.json)"
    echo "  • Commands: $(jq -r '.features.commands' .claude/superclaude.json)"
    echo "  • Modes: $(jq -r '.features.modes' .claude/superclaude.json)"
    echo "  • MCP Servers: $(jq -r '.features.mcp_servers' .claude/superclaude.json)"
    echo ""
    
    echo "Integration:"
    echo "  • Kiro Spec-Driven: $(jq -r '.integration.kiro_spec_driven' .claude/superclaude.json)"
    echo "  • Preserve Existing: $(jq -r '.integration.preserve_existing_workflow' .claude/superclaude.json)"
else
    echo "❌ SuperClaude configuration not found!"
    echo "Run installation to set up SuperClaude Framework."
fi