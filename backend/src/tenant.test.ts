
import dotenv from "dotenv";
import mongoose from "mongoose";
import { updateTenantStatus } from "./modules/tenants/tenant.service";

dotenv.config();

async function restoreTenant() {
  try {
    await mongoose.connect(process.env.MONGO_URI!);

    const tenant = await updateTenantStatus(
      "tenant_test_001",
      "active"
    );

    console.log("Tenant restored:");
    console.log(tenant);

  } catch (error) {
    console.error(error);
  } finally {
    await mongoose.disconnect();
  }
}

restoreTenant();