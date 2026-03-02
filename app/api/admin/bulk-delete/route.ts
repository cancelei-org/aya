import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import { prisma } from '@/lib/prisma';

export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userEmail = session.user.email;

    if (!userEmail) {
      return NextResponse.json(
        { error: 'User email not found' },
        { status: 400 },
      );
    }

    console.log('🗑️ Starting bulk delete operation by user:', userEmail);

    const result = await prisma.$transaction(async (tx) => {
      // Get user by email to get the correct database ID
      const user = await tx.user.findUnique({
        where: { email: userEmail },
        select: { id: true },
      });

      if (!user) {
        throw new Error('User not found in database');
      }

      const userId = user.id;
      console.log('📍 Found user in database with ID:', userId);

      // Get user's projects
      const userProjects = await tx.project.findMany({
        where: { userId },
        select: { id: true },
      });
      const projectIds = userProjects.map((p) => p.id);
      console.log(`📁 Found ${projectIds.length} projects for user`);

      // Delete requirements documents for user's projects
      const deletedRequirements = await tx.requirementsDocument.deleteMany({
        where: { projectId: { in: projectIds } },
      });
      console.log(
        `✅ Deleted ${deletedRequirements.count} requirements documents`,
      );

      // Get canvas nodes that belong to user's projects
      const nodesToDelete = await tx.canvas_nodes.findMany({
        where: { project_id: { in: projectIds } },
        select: { id: true },
      });
      const nodeIds = nodesToDelete.map((n) => n.id);

      // Delete canvas connections that are connected to these nodes
      const deletedConnections = await tx.canvas_connections.deleteMany({
        where: {
          OR: [{ from_id: { in: nodeIds } }, { to_id: { in: nodeIds } }],
        },
      });
      console.log(`✅ Deleted ${deletedConnections.count} canvas connections`);

      // Delete canvas nodes for user's projects
      const deletedNodes = await tx.canvas_nodes.deleteMany({
        where: { project_id: { in: projectIds } },
      });
      console.log(`✅ Deleted ${deletedNodes.count} canvas nodes`);

      // Debug: Check project data before clearing
      const projectsBeforeClear = await tx.project.findMany({
        where: { userId },
        select: {
          id: true,
          nodesData: true,
          connectionsData: true,
        },
      });

      projectsBeforeClear.forEach((p) => {
        const nodes = p.nodesData ? JSON.parse(p.nodesData as string) : [];
        const connections = p.connectionsData
          ? JSON.parse(p.connectionsData as string)
          : [];
        console.log(
          `📊 Project ${p.id} before clear: ${nodes.length} nodes, ${connections.length} connections`,
        );
      });

      // Clear nodes/connections data from user's projects (JSON data)
      const updatedProjects = await tx.project.updateMany({
        where: { userId },
        data: {
          nodesData: JSON.stringify([]), // Clear React Flow nodes JSON
          connectionsData: JSON.stringify([]), // Clear React Flow connections JSON
          pbsStructure: JSON.stringify([]), // Clear PBS structure
          chatMessagesData: JSON.stringify([]), // Clear chat messages
        },
      });
      console.log(
        `✅ Cleared nodes/connections JSON data from ${updatedProjects.count} projects`,
      );

      // Debug: Verify data was cleared
      const projectsAfterClear = await tx.project.findMany({
        where: { userId },
        select: {
          id: true,
          nodesData: true,
          connectionsData: true,
        },
      });

      projectsAfterClear.forEach((p) => {
        const nodes = p.nodesData ? JSON.parse(p.nodesData as string) : [];
        const connections = p.connectionsData
          ? JSON.parse(p.connectionsData as string)
          : [];
        console.log(
          `📊 Project ${p.id} after clear: ${nodes.length} nodes, ${connections.length} connections`,
        );
      });

      return {
        deletedRequirements: deletedRequirements.count,
        deletedNodes: deletedNodes.count,
        deletedConnections: deletedConnections.count,
        updatedProjects: updatedProjects.count,
        clearedJsonData: updatedProjects.count > 0,
      };
    });

    console.log(
      '✅ Bulk delete completed successfully for user:',
      userEmail,
      result,
    );

    return NextResponse.json({
      success: true,
      message: 'Your requirements and system diagram data deleted successfully',
      stats: result,
    });
  } catch (error) {
    console.error('❌ Bulk delete failed:', error);
    return NextResponse.json(
      {
        error: 'Failed to delete data',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    );
  }
}
