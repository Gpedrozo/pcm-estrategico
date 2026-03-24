const SUPABASE_URL = "https://dvwsferonoczgmvfubgu.supabase.co";
const SERVICE_ROLE_KEY = process.argv[2];

async function main() {
  const headers = {
    "apikey": SERVICE_ROLE_KEY,
    "Authorization": `Bearer ${SERVICE_ROLE_KEY}`,
    "Content-Type": "application/json",
  };

  // Check user_roles for the created user
  const userId = "b1cea515-217e-464a-a7eb-d50805888a9d";
  const empresaId = "4b9e6678-e83e-4ede-a055-1da6f9746a5d";

  console.log("=== Check user_roles ===");
  const rolesResp = await fetch(
    `${SUPABASE_URL}/rest/v1/user_roles?user_id=eq.${userId}&select=id,user_id,empresa_id,role`,
    { headers }
  );
  const roles = await rolesResp.json();
  console.log("Roles:", JSON.stringify(roles, null, 2));

  // Check profile
  console.log("\n=== Check profiles ===");
  const profileResp = await fetch(
    `${SUPABASE_URL}/rest/v1/profiles?id=eq.${userId}&select=id,nome,email,empresa_id`,
    { headers }
  );
  const profiles = await profileResp.json();
  console.log("Profile:", JSON.stringify(profiles, null, 2));

  // Check empresa
  console.log("\n=== Check empresa ===");
  const empresaResp = await fetch(
    `${SUPABASE_URL}/rest/v1/empresas?id=eq.${empresaId}&select=id,nome,slug`,
    { headers }
  );
  const empresa = await empresaResp.json();
  console.log("Empresa:", JSON.stringify(empresa, null, 2));

  // Check empresa_config
  console.log("\n=== Check empresa_config ===");
  const configResp = await fetch(
    `${SUPABASE_URL}/rest/v1/empresa_config?empresa_id=eq.${empresaId}&select=*`,
    { headers }
  );
  const config = await configResp.json();
  console.log("Config:", JSON.stringify(config, null, 2));

  // Summary
  console.log("\n=== SUMMARY ===");
  const hasRole = roles.length > 0;
  const hasProfile = profiles.length > 0;
  const hasCompany = empresa.length > 0;
  console.log(`Company: ${hasCompany ? '✅' : '❌'}`);
  console.log(`Profile: ${hasProfile ? '✅' : '❌'}`);
  console.log(`Role: ${hasRole ? '✅' : '❌'} ${hasRole ? roles[0].role : 'MISSING'}`);
  console.log(`Config: ${config.length > 0 ? '✅' : '❌'}`);
}

main().catch(console.error);
