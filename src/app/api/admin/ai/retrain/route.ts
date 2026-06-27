import { AIFeedbackStatus, AITrainingJobStatus } from '@/generated/prisma'
import { triggerAIRetrain } from '@/lib/aiClient'
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  const token = process.env.AI_RETRAIN_TOKEN?.trim()
  const incomingToken = request.headers.get('x-ai-retrain-token')?.trim()

  if (!token || incomingToken !== token) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = (await request.json().catch(() => ({}))) as { mode?: 'cpu' | 'gpu'; baseModel?: string }
  const mode = body.mode === 'gpu' ? 'gpu' : 'cpu'
  const baseModel =
    body.baseModel?.trim() ||
    (mode === 'gpu'
      ? process.env.AI_MODEL_GPU || process.env.AI_MODEL_CPU || 'model'
      : process.env.AI_MODEL_CPU || process.env.AI_MODEL_GPU || 'model')

  const trainingSet = await prisma.aIFeedback.findMany({
    where: { status: { in: [AIFeedbackStatus.ACCEPTED, AIFeedbackStatus.EDITED] } },
    orderBy: { createdAt: 'desc' },
    take: 500,
    include: {
      generation: {
        select: {
          type: true,
          inputPayload: true,
          suggestion: true,
          modelName: true,
          modelVersion: true,
        },
      },
    },
  })

  const trainingExamples = trainingSet.map((item) => ({
    generationType: item.generation.type,
    inputPayload: item.generation.inputPayload,
    suggestedOutput: item.generation.suggestion,
    status: item.status,
    finalValues: item.finalValues,
    sourceModelName: item.generation.modelName,
    sourceModelVersion: item.generation.modelVersion,
  }))

  const job = await prisma.aITrainingJob.create({
    data: {
      status: AITrainingJobStatus.PENDING,
      mode,
      baseModel,
      payload: { trainingExamples: trainingExamples.length, trigger: 'scheduled-route' },
    },
    select: { id: true },
  })

  try {
    await prisma.aITrainingJob.update({
      where: { id: job.id },
      data: { status: AITrainingJobStatus.RUNNING, startedAt: new Date() },
    })

    const retrain = await triggerAIRetrain({ mode, baseModel, trainingExamples })

    await prisma.$transaction([
      prisma.aIModelVersion.updateMany({ data: { isActive: false } }),
      prisma.aIModelVersion.create({
        data: {
          modelName: retrain.modelName,
          version: retrain.modelVersion,
          mode: retrain.mode,
          metadata: { trainingExamples: trainingExamples.length, sourceJobId: job.id, trigger: 'scheduled-route' },
          isActive: true,
        },
      }),
      prisma.aITrainingJob.update({
        where: { id: job.id },
        data: {
          status: AITrainingJobStatus.SUCCEEDED,
          completedAt: new Date(),
          result: retrain,
        },
      }),
    ])

    return NextResponse.json({ ok: true, jobId: job.id, modelVersion: retrain.modelVersion })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'AI retraining failed'
    await prisma.aITrainingJob.update({
      where: { id: job.id },
      data: {
        status: AITrainingJobStatus.FAILED,
        completedAt: new Date(),
        error: message,
      },
    })

    return NextResponse.json({ ok: false, jobId: job.id, error: message }, { status: 500 })
  }
}
