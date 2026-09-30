export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;

    // Enable CORS so your frontend can talk to the worker smoothly
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    };

    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    try {
      // 1. GET ALL BILLS FROM D1
      if (path === "/api/bills" && request.method === "GET") {
        const { results } = await env.DB.prepare("SELECT data_json FROM bills ORDER BY updated_at DESC").all();
        const bills = results.map(row => JSON.parse(row.data_json));
        return new Response(JSON.stringify(bills), {
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }

      // 2. SAVE OR UPDATE A BILL IN D1
      if (path === "/api/bills" && request.method === "POST") {
        const bill = await request.json();
        if (!bill.id || !bill.diary_no) {
          return new Response(JSON.stringify({ error: "Missing required bill fields" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" }
          });
        }

        const dataJson = JSON.stringify(bill);
        await env.DB.prepare(`
          INSERT INTO bills (id, diary_no, hospital_name, bill_amount, status, data_json, updated_at)
          VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)
          ON CONFLICT(id) DO UPDATE SET
            diary_no = ?2,
            hospital_name = ?3,
            bill_amount = ?4,
            status = ?5,
            data_json = ?6,
            updated_at = ?7
        `).bind(
          bill.id,
          bill.diary_no,
          bill.hospital_name || '',
          bill.bill_amount || 0,
          bill.status || 'Pending',
          dataJson,
          new Date().toISOString()
        ).run();

        return new Response(JSON.stringify({ success: true, id: bill.id }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }

      // 3. DELETE A BILL FROM D1
      if (path.startsWith("/api/bills/") && request.method === "POST") {
        const id = path.split("/")[3];
        await env.DB.prepare("DELETE FROM bills WHERE id = ?").bind(id).run();
        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }

      return new Response("Not Found", { status: 404, headers: corsHeaders });

    } catch (err) {
      return new Response(JSON.stringify({ error: err.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }
  }
};