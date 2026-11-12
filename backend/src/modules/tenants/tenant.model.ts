import mongoose, { Schema, type Model } from "mongoose";

import type { TenantConfig } from "./tenant.types";

const tenantSchema = new Schema<TenantConfig>(
  {
    tenantId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },

    databaseName: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },

    status: {
      type: String,
      enum: ["active", "inactive"],
      default: "active",
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

export const TenantModel: Model<TenantConfig> =
  mongoose.models.Tenant ||
  mongoose.model<TenantConfig>("Tenant", tenantSchema);