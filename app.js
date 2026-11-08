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
    const [attendance,paymentsToday,invoices,paymentsAll] = await Promise.all([
      db.from("attendance").select("status").eq("attendance_date",today),
      db.from("payment_records").select("amount,received_at").gte("received_at",today+"T00:00:00+03:00").lt("received_at",new Date(Date.parse(today+"T00:00:00+03:00")+86400000).toISOString()),
      db.from("student_invoices").select("id,amount_due"),
      db.from("payment_records").select("invoice_id,amount")
    ]);
    if (!attendance.error) $("presentToday").textContent = (attendance.data||[]).filter(x=>String(x.status).toLowerCase()==="present").length.toLocaleString("en-UG");
    if (!paymentsToday.error) $("feesRecorded").textContent = money((paymentsToday.data||[]).reduce((n,x)=>n+Number(x.amount||0),0));
    if (!invoices.error && !paymentsAll.error) {
      const paidByInvoice = new Map();
      (paymentsAll.data||[]).forEach(x=>{if(x.invoice_id)paidByInvoice.set(x.invoice_id,(paidByInvoice.get(x.invoice_id)||0)+Number(x.amount||0));});
      const outstanding=(invoices.data||[]).reduce((n,x)=>n+Math.max(0,Number(x.amount_due||0)-(paidByInvoice.get(x.id)||0)),0);
      $("feeBalance").textContent=money(outstanding);
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

  window.addStudent = function () {
    const panel = $("studentFormPanel");
    if (!canAdmissions()) {
      if (panel) panel.hidden = true;
      alert("Student admission is restricted to the registrar, school leadership and authorised administrators.");
      return;
    }
    if (!panel) return alert("Student registration form is unavailable. Please refresh the portal.");
    panel.hidden = false;
    $("studentCreateMsg").textContent = "Enter the student's official details. Class placement is completed in Enrolment after classes and an academic year are configured.";
    $("newStudentFirst").focus();
  };

  window.cancelStudentForm = function () {
    const form = $("studentCreateForm");
    if (form) form.reset();
    if ($("studentFormPanel")) $("studentFormPanel").hidden = true;
    if ($("studentCreateMsg")) $("studentCreateMsg").textContent = "";
  };

  const studentForm = $("studentCreateForm");
  if (studentForm) studentForm.addEventListener("submit", async function (event) {
    event.preventDefault();
    if (!canAdmissions()) return $("studentCreateMsg").textContent = "Your account is not authorised to admit students.";
    const first = $("newStudentFirst").value.trim();
    const middle = $("newStudentMiddle").value.trim();
    const last = $("newStudentLast").value.trim();
    const code = $("newStudentCode").value.trim();
    if (!first || !last || !code) return $("studentCreateMsg").textContent = "First name, last name and admission number are required.";
    const button = $("saveStudentBtn");
    button.disabled = true;
    $("studentCreateMsg").textContent = "Saving student record…";
    try {
      const admissionDate = $("newStudentAdmission").value; const dob = $("newStudentDob").value; if (dob && admissionDate && dob > admissionDate) { $("studentCreateMsg").textContent = "Date of birth cannot be later than the admission date."; return; } const payload = { first_name:first, middle_name:middle || null, last_name:last, student_no:code, sex:$("newStudentSex").value || null, date_of_birth:dob || null, admission_date:admissionDate, status:$("newStudentStatus").value, address:$("newStudentAddress").value.trim() || null, photo_url:$("newStudentPhoto").value.trim() || null, medical_notes:$("newStudentMedical").value.trim() || null };
      const r = await db.from("students").insert(payload).select("id").single();
      if (r.error) throw r.error;
      await Promise.all([loadStudents(), loadDashboard()]);
      studentForm.reset();
      $("newStudentAdmission").value = new Date().toLocaleDateString("en-CA",{timeZone:"Africa/Kampala"});
      $("studentCreateMsg").textContent = "Student record saved successfully. Open Enrolment to assign the student to a class and academic year.";
    } catch (error) {
      $("studentCreateMsg").textContent = "Could not save student: " + (error?.message || "Unexpected error. Please try again.");
    } finally {
      button.disabled = false;
    }
  });

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