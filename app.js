/* BCS Digital Campus - live Supabase client */
(function () {
  const URL = "https://ynacnystxmlfvyqetovu.supabase.co";
  const KEY = "sb_publishable_jqL4f794_NDcCSdnfVYoDA_UyDZDDyJ";
  const db = window.supabase.createClient(URL, KEY);
  let profile = null;
  let currentStudents = [];

  const $ = (id) => document.getElementById(id);
  const roles = {
    school_admin: "School Administrator", director: "Director",
    head_teacher: "Head Teacher", deputy_head_teacher: "Deputy Head Teacher",
    bursar: "Bursar", registrar: "Registrar", teacher: "Teacher", parent: "Parent"
  };
  const canAdmissions = () => profile && ["school_admin","director","head_teacher","deputy_head_teacher","registrar"].includes(profile.role);
  const canFinance = () => profile && ["school_admin","director","head_teacher","bursar"].includes(profile.role);
  const canPublish = () => profile && ["school_admin","director","head_teacher","deputy_head_teacher","registrar"].includes(profile.role);
  const safe = (v) => String(v == null ? "" : v).replace(/[&<>"']/g, (c) => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const message = (v, bad) => {
    const el = $("authMessage");
    if (el) { el.textContent = v; el.style.color = bad ? "#ff9da4" : "#91aab5"; }
  };

  async function showSession() {
    const result = await db.auth.getUser();
    const user = result.data.user;
    if (!user) { $("login").style.display = "grid"; return; }
    const p = await db.from("profiles").select("full_name,email,role,is_active").eq("id", user.id).maybeSingle();
    if (p.error || !p.data || !p.data.is_active) {
      await db.auth.signOut();
      message("Your school account is inactive or not yet provisioned. Contact the school administrator.", true);
      $("login").style.display = "grid";
      return;
    }
    profile = p.data;
    $("login").style.display = "none";
    $("userName").textContent = profile.full_name || user.email;
    $("userRole").textContent = roles[profile.role] || profile.role;
    $("userAvatar").textContent = (profile.full_name || user.email).slice(0,2).toUpperCase();
    await Promise.all([loadStudents(), loadAnnouncements(), loadDashboard()]);
  }

  window.signIn = async function () {
    const email = $("authEmail").value.trim();
    const password = $("authPassword").value;
    if (!email || !password) return message("Enter your email and password.", true);
    message("Signing in…");
    const r = await db.auth.signInWithPassword({ email, password });
    if (r.error) return message(r.error.message, true);
    await showSession();
  };

  window.createParentAccount = async function () {
    const email = $("authEmail").value.trim();
    const password = $("authPassword").value;
    if (!email || password.length < 8) return message("Enter a valid email and a password of at least 8 characters.", true);
    message("Creating account…");
    const r = await db.auth.signUp({ email, password });
    if (r.error) return message(r.error.message, true);
    if (r.data.session) await showSession();
    else message("Account created. Check your email to confirm, then sign in. New accounts start with parent access.");
  };

  window.signOut = async function () {
    await db.auth.signOut();
    profile = null;
    $("login").style.display = "grid";
    message("You have signed out.");
  };

  async function loadDashboard() {
    const today = new Intl.DateTimeFormat("en-CA",{timeZone:"Africa/Kampala"}).format(new Date());
    const money = n => "UGX " + Number(n||0).toLocaleString("en-UG",{maximumFractionDigits:0});
    const count = await db.from("students").select("id",{count:"exact",head:true});
    if (!count.error && count.count != null) $("studentCount").textContent = count.count.toLocaleString("en-UG");
    const [attendance,payments,invoices] = await Promise.all([
      db.from("attendance").select("status").eq("attendance_date",today),
      db.from("payment_records").select("amount,received_at").gte("received_at",today+"T00:00:00+03:00"),
      db.from("student_invoices").select("amount_due")
    ]);
    if (!attendance.error) $("presentToday").textContent = (attendance.data||[]).filter(x=>String(x.status).toLowerCase()==="present").length.toLocaleString("en-UG");
    if (!payments.error) $("feesRecorded").textContent = money((payments.data||[]).reduce((n,x)=>n+Number(x.amount||0),0));
    if (!payments.error && !invoices.error) {
      const due=(invoices.data||[]).reduce((n,x)=>n+Number(x.amount_due||0),0);
      const paid=(payments.data||[]).reduce((n,x)=>n+Number(x.amount||0),0);
      $("feeBalance").textContent=money(Math.max(0,due-paid));
    }
  }

  async function loadStudents() {
    const body = $("studentsBody");
    body.innerHTML = '<tr><td colspan="4" class="empty">Loading authorised student records…</td></tr>';
    const r = await db.from("students")
      .select("id,student_no,first_name,middle_name,last_name,status,enrollments(classes(name))")
      .order("last_name");
    if (r.error) {
      body.innerHTML = '<tr><td colspan="4" class="empty">Unable to load records: ' + safe(r.error.message) + '</td></tr>';
      currentStudents = [];
      return;
    }
    currentStudents = r.data || [];
    window.renderStudents();
  }

  window.renderStudents = function () {
    const q = ($("studentSearch").value || "").toLowerCase();
    const rows = currentStudents.filter((s) =>
      (s.first_name + " " + (s.middle_name || "") + " " + s.last_name + " " + s.student_no).toLowerCase().includes(q)
    );
    $("studentsBody").innerHTML = rows.map((s) =>
      "<tr><td><b>" + safe([s.first_name,s.middle_name,s.last_name].filter(Boolean).join(" ")) +
      "</b></td><td>" + safe(s.student_no) + "</td><td>" +
      safe(s.enrollments && s.enrollments[0] && s.enrollments[0].classes ? s.enrollments[0].classes.name : "Not enrolled") +
      '</td><td><span class="pill">' + safe(s.status) + "</span></td></tr>"
    ).join("") || '<tr><td colspan="4" class="empty">No matching authorised records.</td></tr>';
  };

  window.addStudent = async function () {
    if (!canAdmissions()) return alert("Your account does not have student admission permissions.");
    const first = prompt("Student first name:");
    if (!first) return;
    const last = prompt("Student last name:");
    if (!last) return;
    const code = prompt("School admission/student number:");
    if (!code) return;
    const r = await db.from("students").insert({
      first_name: first.trim(), last_name: last.trim(), student_no: code.trim()
    }).select("id").single();
    if (r.error) return alert("Could not save student: " + r.error.message);
    await loadStudents();
    await loadDashboard();
    alert("Student record saved. Class enrolment can be completed after the school class and academic-year setup is entered.");
  };

  window.recordPayment = async function () {
    if (!canFinance()) return $("feeMessage").textContent = "Your account does not have bursar permissions.";
    const studentNo = $("payer").value.trim();
    const amount = Number($("amount").value);
    const method = $("method").value.toLowerCase().replace("mobile money", "mobile_money");
    if (!studentNo || !Number.isFinite(amount) || amount <= 0) return $("feeMessage").textContent = "Enter a student admission number and a valid amount.";
    const student = currentStudents.find((s) => s.student_no.toLowerCase() === studentNo.toLowerCase());
    if (!student) return $("feeMessage").textContent = "Student not found in the records visible to this account.";
    const auth = await db.auth.getUser();
    const receipt = "BCS-" + Date.now().toString(36).toUpperCase();
    const r = await db.from("payment_records").insert({
      student_id: student.id, receipt_no: receipt, amount: amount,
      payment_method: method, received_by: auth.data.user.id
    });
    if (r.error) return $("feeMessage").textContent = "Could not save payment record: " + r.error.message;
    $("payments").innerHTML = '<div class="row">' + safe(studentNo) + " · UGX " + amount.toLocaleString() + " · " + safe(method) + " · " + safe(receipt) + "</div>" + $("payments").innerHTML;
    $("feeMessage").textContent = "Receipt record saved. No money was collected or processed by this portal.";
    $("payer").value = "";
    $("amount").value = "";
  };

  window.publishNotice = async function () {
    if (!canPublish()) return alert("Your account does not have announcement permissions.");
    const title = $("noticeText").value.trim();
    if (!title) return;
    const auth = await db.auth.getUser();
    const r = await db.from("announcements").insert({
      title: title, body: title, audience: "all", published: true, created_by: auth.data.user.id
    });
    if (r.error) return alert("Could not publish announcement: " + r.error.message);
    $("noticeText").value = "";
    await loadAnnouncements();
  };

  async function loadAnnouncements() {
    const list = $("noticeList");
    const r = await db.from("announcements").select("id,title,created_at")
      .order("created_at", { ascending: false }).limit(30);
    if (r.error) {
      list.innerHTML = '<div class="empty">Announcements are not available to this account.</div>';
      return;
    }
    list.innerHTML = (r.data || []).map((n) =>
      '<div class="row"><span>' + safe(n.title) + '</span><small class="muted">' +
      new Date(n.created_at).toLocaleDateString() + "</small></div>"
    ).join("") || '<div class="empty">No announcements have been published.</div>';
  }

  db.auth.onAuthStateChange(function (event, session) {
    if (event === "SIGNED_IN" && session) setTimeout(showSession, 0);
  });
  showSession();
})();