const SUPABASE_URL = "https://dvwsferonoczgmvfubgu.supabase.co";
const SERVICE_ROLE_KEY = process.argv[2];

const headers = {
  "apikey": SERVICE_ROLE_KEY,
  "Authorization": `Bearer ${SERVICE_ROLE_KEY}`,
  "Content-Type": "application/json",
};

async function main() {
  // List all tables in public schema
  const resp = await fetch(
    `${SUPABASE_URL}/rest/v1/rpc/owner_list_database_tables`,
    { method: "POST", headers, body: JSON.stringify({}) }
  );

  if (!resp.ok) {
    console.log("RPC failed, trying information_schema...");
    // Fallback: query via PostgREST - list all accessible tables
    // Use a raw SQL approach via pg_catalog
    const tablesQuery = await fetch(
      `${SUPABASE_URL}/rest/v1/?apikey=${SERVICE_ROLE_KEY}`,
      { headers: { "apikey": SERVICE_ROLE_KEY, "Authorization": `Bearer ${SERVICE_ROLE_KEY}` } }
    );
    if (tablesQuery.ok) {
      const openApi = await tablesQuery.json();
      const tables = Object.keys(openApi.definitions || openApi.paths || {});
      console.log("Tables from OpenAPI schema:", tables.sort().join("\n"));
    } else {
      console.log("OpenAPI failed too:", tablesQuery.status);
    }
    return;
  }

  const data = await resp.json();
  console.log(JSON.stringify(data, null, 2));
}

main().catch(console.error);
