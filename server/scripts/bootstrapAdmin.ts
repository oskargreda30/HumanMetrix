import bcrypt from "bcryptjs";
import { storage } from "../storage";

async function bootstrapAdmin() {
  console.log("🔧 Bootstrap Admin User Script");
  console.log("================================\n");

  const adminEmail = process.env.ADMIN_EMAIL;
  const adminPassword = process.env.ADMIN_PASSWORD;

  if (!adminEmail || !adminPassword) {
    console.error("❌ Error: ADMIN_EMAIL and ADMIN_PASSWORD environment variables must be set");
    console.error("\nUsage:");
    console.error("  ADMIN_EMAIL=admin@example.com ADMIN_PASSWORD=your_password tsx server/scripts/bootstrapAdmin.ts");
    process.exit(1);
  }

  try {
    // Check if user already exists
    const existingUser = await storage.getUserByEmail(adminEmail);
    
    if (existingUser) {
      if (existingUser.role === 'super_admin' || existingUser.role === 'organization_admin') {
        console.log(`✅ Admin user already exists: ${adminEmail}`);
        console.log(`   Role: ${existingUser.role}`);
        console.log("   No action needed.");
      } else {
        console.log(`⚠️  User ${adminEmail} exists but is not an admin.`);
        console.log("   Manual intervention required to set role='super_admin' in database.");
      }
      process.exit(0);
    }

    // Hash the password
    console.log("🔐 Hashing password...");
    const passwordHash = await bcrypt.hash(adminPassword, 10);

    // Create admin user with super_admin role
    console.log(`👤 Creating admin user: ${adminEmail}...`);
    const adminUser = await storage.createUser({
      email: adminEmail,
      passwordHash,
      firstName: null,
      lastName: null,
      profileImageUrl: null,
      role: 'super_admin',
    });

    console.log("\n✅ SUCCESS!");
    console.log(`   Admin user created: ${adminUser.email}`);
    console.log(`   User ID: ${adminUser.id}`);
    console.log(`   Role: ${adminUser.role}`);
    console.log("\n🎉 You can now log in with these credentials.");
    process.exit(0);

  } catch (error) {
    console.error("\n❌ Failed to create admin user:");
    console.error(error);
    process.exit(1);
  }
}

bootstrapAdmin();
