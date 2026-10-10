-- CreateEnum
CREATE TYPE "Plan" AS ENUM ('FREE', 'PRO');

-- CreateEnum
CREATE TYPE "EstadoSuscripcion" AS ENUM ('ACTIVA', 'CANCELADA', 'VENCIDA');

-- AlterTable
ALTER TABLE "Suscripcion" ADD COLUMN     "estado" "EstadoSuscripcion" NOT NULL DEFAULT 'ACTIVA',
ADD COLUMN     "plan" "Plan" NOT NULL DEFAULT 'FREE',
ADD COLUMN     "stripeCustomerId" TEXT,
ADD COLUMN     "stripeSubscriptionId" TEXT,
ADD COLUMN     "vigenteHasta" TIMESTAMP(3);
