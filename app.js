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
    startLiveSync();
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

  let liveSyncStarted = false, liveRefreshTimer = null;
  function startLiveSync() {
    if (liveSyncStarted) return;
    liveSyncStarted = true;
    let queued = false;
    const refreshVisibleData = async () => {
      if (!profile || document.hidden || queued) return;
      queued = true;
      try { await Promise.allSettled([loadStudents(), loadAnnouncements(), loadDashboard()]); }
      finally { queued = false; }
    };
    const channel = db.channel("bcs-live-school-updates")
      .on("postgres_changes", {event:"*",schema:"public",table:"students"}, refreshVisibleData)
      .on("postgres_changes", {event:"*",schema:"public",table:"enrollments"}, refreshVisibleData)
      .on("postgres_changes", {event:"*",schema:"public",table:"attendance"}, refreshVisibleData)
      .on("postgres_changes", {event:"*",schema:"public",table:"student_invoices"}, refreshVisibleData)
      .on("postgres_changes", {event:"*",schema:"public",table:"payment_records"}, refreshVisibleData)
      .on("postgres_changes", {event:"*",schema:"public",table:"announcements"}, refreshVisibleData)
      .subscribe();
    // Polling is a fallback when Realtime is unavailable or the device reconnects.
    liveRefreshTimer = window.setInterval(refreshVisibleData, 60000);
    document.addEventListener("visibilitychange", () => { if (!document.hidden) refreshVisibleData(); });
    window.addEventListener("online", refreshVisibleData);
  }

  async function loadStudents() {
    const body = $("studentsBody");
    body.innerHTML = '<tr><td colspan="4" class="empty">Loading authorised student records…</td></tr>';
    const r = await db.from("students")
      .select("id,student_no,first_name,middle_name,last_name,sex,date_of_birth,admission_date,status,address,photo_url,medical_notes,guardian_name,guardian_relationship,guardian_phone,guardian_alt_phone,guardian_email,guardian_address,father_name,father_phone,mother_name,mother_phone,emergency_contact_name,emergency_contact_relationship,emergency_contact_phone,former_school,former_school_address,former_school_contact,previous_class,last_school_year,transfer_certificate_no,boarding_status,transport_details,enrollments(classes(name))")
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
    const input = $("studentSearch");
    const raw = input ? input.value : "";
    const normalise = value => String(value == null ? "" : value)
      .normalize("NFD").replace(/[\\u0300-\\u036f]/g, "")
      .toLowerCase().replace(/[^a-z0-9@.+-]+/g, " ").trim();
    const terms = normalise(raw).split(/\\s+/).filter(Boolean);
    const searchableText = s => {
      const classNames = (Array.isArray(s.enrollments) ? s.enrollments : s.enrollments ? [s.enrollments] : [])
        .map(e => e && e.classes ? (Array.isArray(e.classes) ? e.classes.map(c => c.name).join(" ") : e.classes.name) : "")
        .join(" ");
      return normalise([
        s.student_no, s.first_name, s.middle_name, s.last_name,
        [s.first_name,s.middle_name,s.last_name].filter(Boolean).join(" "),
        s.sex, s.status, s.date_of_birth, s.admission_date, s.address,
        s.guardian_name, s.guardian_relationship, s.guardian_phone,
        s.guardian_alt_phone, s.guardian_email, s.guardian_address,
        s.father_name, s.father_phone, s.mother_name, s.mother_phone,
        s.emergency_contact_name, s.emergency_contact_relationship,
        s.emergency_contact_phone, s.former_school, s.former_school_address,
        s.former_school_contact, s.previous_class, s.last_school_year,
        s.transfer_certificate_no, s.boarding_status, s.transport_details,
        classNames
      ].filter(Boolean).join(" "));
    };
    const rows = currentStudents.filter(s => {
      if (!terms.length) return true;
      const haystack = searchableText(s);
      return terms.every(term => haystack.includes(term));
    });
    const count = $("studentSearchCount");
    if (count) count.textContent = raw.trim()
      ? "Showing " + rows.length.toLocaleString("en-UG") + " of " + currentStudents.length.toLocaleString("en-UG") + " students"
      : currentStudents.length.toLocaleString("en-UG") + " authorised student records";
    const body = $("studentsBody");
    if (!body) return;
    body.innerHTML = rows.map((s) => {
      const name = [s.first_name,s.middle_name,s.last_name].filter(Boolean).join(" ");
      const enrolments = Array.isArray(s.enrollments) ? s.enrollments : s.enrollments ? [s.enrollments] : [];
      const className = enrolments.map(e => e && e.classes ? (Array.isArray(e.classes) ? e.classes.map(c=>c.name).join(", ") : e.classes.name) : "").filter(Boolean).join(", ") || "Not enrolled";
      return "<tr><td><b>" + safe(name) +
        "</b><small class='muted' style='display:block'>" + safe(s.guardian_name || s.guardian_phone || "") + "</small></td><td>" + safe(s.student_no || "—") + "</td><td>" +
        safe(className) +
        '</td><td><span class="pill">' + safe(s.status || "—") + '</span> <button class="btn small secondary" type="button" onclick="openStudentProfile(\'' + safe(s.id) + '\')">View profile</button></td></tr>';
    }).join("") || '<tr><td colspan="4" class="empty">No matching authorised records. Try a different name, admission number, guardian contact, class or other detail.</td></tr>';
  };

  window.clearStudentSearch = function () {
    const input = $("studentSearch");
    if (input) { input.value = ""; input.focus(); }
    window.renderStudents();
  };

  const profileField = (label, value) => '<div class="profile-field"><small>' + label + '</small><b>' + (value ? safe(String(value)) : '<span class="muted">Not provided</span>') + '</b></div>';
  const profileSection = (title, content) => '<section class="profile-section"><h3>' + title + '</h3>' + content + '</section>';
  const profileRows = (rows, empty) => rows.length ? '<div class="tablewrap"><table><tbody>' + rows.join('') + '</tbody></table></div>' : '<p class="muted">' + empty + '</p>';

  window.openStudentProfile = async function (studentId) {
    const panel = $("studentProfilePanel");
    if (!panel) return;
    const student = currentStudents.find(s => s.id === studentId);
    if (!student) { panel.hidden = false; panel.innerHTML = '<p class="notice">Student record is not available in the current authorised list. Refresh and try again.</p>'; return; }
    panel.hidden = false;
    panel.innerHTML = '<div class="card"><p class="muted">Loading complete student profile…</p></div>';
    panel.scrollIntoView({behavior:"smooth",block:"start"});
    const sid = student.id;
    const jobs = await Promise.all([
      db.from("enrollments").select("id,class_id,academic_year_id,roll_number,status,enrolled_on").eq("student_id",sid).order("enrolled_on",{ascending:false}),
      db.from("attendance").select("attendance_date,session,status,notes").eq("student_id",sid).order("attendance_date",{ascending:false}).limit(30),
      db.from("assessment_results").select("score,teacher_comment,created_at,assessments(title,assessment_type,max_score,assessment_date,subjects(name),terms(name))").eq("student_id",sid).order("created_at",{ascending:false}).limit(50),
      db.from("student_invoices").select("id,invoice_no,description,amount_due,due_date,issued_at").eq("student_id",sid).order("issued_at",{ascending:false}),
      db.from("payment_records").select("invoice_id,receipt_no,amount,payment_method,payment_reference,received_at,notes").eq("student_id",sid).order("received_at",{ascending:false})
    ]);
    const [enr,att,marks,inv,pay] = jobs.map(x=>x.data||[]);
    const errs = jobs.map((x,i)=>x.error?["Class history","Attendance","Academic results","Fee invoices","Recorded payments"][i]+": "+x.error.message:null).filter(Boolean);
    const classIds=[...new Set(enr.map(x=>x.class_id).filter(Boolean))], yearIds=[...new Set(enr.map(x=>x.academic_year_id).filter(Boolean))];
    let classes=[],years=[];
    if(classIds.length){const x=await db.from("classes").select("id,name,level,stream").in("id",classIds);classes=x.data||[];if(x.error)errs.push("Class names: "+x.error.message);}
    if(yearIds.length){const x=await db.from("academic_years").select("id,name").in("id",yearIds);years=x.data||[];if(x.error)errs.push("Academic years: "+x.error.message);}
    const byId=(arr,id)=>arr.find(x=>x.id===id);
    const invoicesById=new Map(inv.map(x=>[x.id,x]));
    const paidByInvoice=new Map(); pay.forEach(x=>{if(x.invoice_id)paidByInvoice.set(x.invoice_id,(paidByInvoice.get(x.invoice_id)||0)+Number(x.amount||0));});
    const invoiceTotal=inv.reduce((n,x)=>n+Number(x.amount_due||0),0);
    const allocated=pay.reduce((n,x)=>n+Number(x.invoice_id?x.amount:0),0);
    const unallocated=pay.reduce((n,x)=>n+Number(x.invoice_id?0:x.amount),0);
    const outstanding=inv.reduce((n,x)=>n+Math.max(0,Number(x.amount_due||0)-(paidByInvoice.get(x.id)||0)),0);
    const fmt=n=>"UGX "+Number(n||0).toLocaleString("en-UG");
    const fullName=[student.first_name,student.middle_name,student.last_name].filter(Boolean).join(" ");
    const personal=[
      ["Admission number",student.student_no],["Full name",fullName],["Sex",student.sex],["Date of birth",student.date_of_birth],["Admission date",student.admission_date],["Status",student.status],["Home address",student.address],["Boarding status",student.boarding_status],["Transport / pickup",student.transport_details],["Medical notes",student.medical_notes]
    ].map(([k,v])=>profileField(k,v)).join("");
    const guardian=[
      ["Primary parent / guardian",student.guardian_name],["Relationship",student.guardian_relationship],["Primary phone",student.guardian_phone],["Alternative phone",student.guardian_alt_phone],["Email",student.guardian_email],["Address",student.guardian_address],["Father",student.father_name],["Father's phone",student.father_phone],["Mother",student.mother_name],["Mother's phone",student.mother_phone],["Emergency contact",student.emergency_contact_name],["Emergency relationship",student.emergency_contact_relationship],["Emergency phone",student.emergency_contact_phone]
    ].map(([k,v])=>profileField(k,v)).join("");
    const previous=[
      ["Former school",student.former_school],["Former school location",student.former_school_address],["Former school contact",student.former_school_contact],["Previous class",student.previous_class],["Last school year",student.last_school_year],["Transfer certificate",student.transfer_certificate_no]
    ].map(([k,v])=>profileField(k,v)).join("");
    const enrolRows=enr.map(x=>{const c=byId(classes,x.class_id),y=byId(years,x.academic_year_id);return '<tr><td>'+safe(c?.name||"Class unavailable")+(c?.stream?' · '+safe(c.stream):'')+'</td><td>'+safe(y?.name||"Year unavailable")+'</td><td>'+safe(x.roll_number||"—")+'</td><td>'+safe(x.status||"—")+'</td><td>'+safe(x.enrolled_on||"—")+'</td></tr>';});
    const attRows=att.map(x=>'<tr><td>'+safe(x.attendance_date)+'</td><td>'+safe(x.session||"—")+'</td><td>'+safe(x.status)+'</td><td>'+safe(x.notes||"—")+'</td></tr>');
    const markRows=marks.map(x=>{const a=x.assessments||{};return '<tr><td>'+safe(a.title||"Assessment")+'</td><td>'+safe(a.subjects?.name||"—")+'</td><td>'+safe(a.terms?.name||"—")+'</td><td>'+safe(x.score)+' / '+safe(a.max_score||"—")+'</td><td>'+safe(a.assessment_date||"—")+'</td><td>'+safe(x.teacher_comment||"—")+'</td></tr>';});
    const invoiceRows=inv.map(x=>'<tr><td>'+safe(x.invoice_no||"—")+'</td><td>'+safe(x.description||"—")+'</td><td>'+safe(x.due_date||"—")+'</td><td>'+fmt(x.amount_due)+'</td><td>'+fmt(paidByInvoice.get(x.id)||0)+'</td><td>'+fmt(Math.max(0,Number(x.amount_due||0)-(paidByInvoice.get(x.id)||0)))+'</td></tr>');
    const paymentRows=pay.map(x=>'<tr><td>'+safe(x.received_at||"—")+'</td><td>'+safe(x.receipt_no||"—")+'</td><td>'+safe(x.payment_method||"—")+'</td><td>'+safe(x.payment_reference||"—")+'</td><td>'+fmt(x.amount)+'</td><td>'+safe(x.notes||"—")+'</td></tr>');
    panel.innerHTML='<div class="card student-profile-sheet"><div class="student-profile-head"><div><div class="eyebrow">Bukedea Comprehensive School</div><h2>'+safe(fullName)+'</h2><p class="muted">Student profile · '+safe(student.student_no)+'</p><b>KNOWLEDGE &amp; INNOVATION</b></div><div class="profile-actions"><button class="btn small" onclick="printStudentProfile()">Print profile</button><button class="btn small secondary" onclick="closeStudentProfile()">Close</button></div></div>'+
      (student.photo_url?'<img class="student-profile-photo" src="'+safe(student.photo_url)+'" alt="Student photograph" onerror="this.style.display=\'none\'">':'')+
      profileSection("Personal and admission information",'<div class="profile-fields">'+personal+'</div>')+
      profileSection("Parent, guardian and emergency contacts",'<div class="profile-fields">'+guardian+'</div>')+
      profileSection("Previous school history",'<div class="profile-fields">'+previous+'</div>')+
      profileSection("Class and enrolment history",profileRows(enrolRows,"No class enrolments have been recorded."))+
      profileSection("Attendance history (latest 30 entries)",profileRows(attRows,"No attendance records have been recorded."))+
      profileSection("Academic performance (latest 50 results)",profileRows(markRows,"No assessment results have been recorded."))+
      profileSection("Fees and account summary",'<div class="profile-fields">'+profileField("Total invoiced",fmt(invoiceTotal))+profileField("Payments allocated",fmt(allocated))+profileField("Unallocated receipts",fmt(unallocated))+profileField("Outstanding invoice balance",fmt(outstanding))+'</div>'+profileRows(invoiceRows,"No fee invoices have been recorded."))+
      profileSection("Recorded payment history",profileRows(paymentRows,"No fee payments have been recorded."))+
      (errs.length?'<div class="notice">Some profile sections could not be loaded: '+errs.map(safe).join(" · ")+'</div>':'')+
      '<div class="profile-print-footer">BUKEDEA COMPREHENSIVE SCHOOL · KNOWLEDGE &amp; INNOVATION · P.O. Box 195, Bukedea, Eastern Uganda</div></div>';
  };
  window.closeStudentProfile = function(){const p=$("studentProfilePanel");if(p)p.hidden=true;document.body.classList.remove("student-profile-print-mode");};
  window.printStudentProfile = function(){document.body.classList.add("student-profile-print-mode");window.print();setTimeout(()=>document.body.classList.remove("student-profile-print-mode"),800);};

  window.addStudent = function () {
    const panel = $("studentFormPanel");
    if (!canAdmissions()) {
      if (panel) panel.hidden = true;
      alert("Student admission is restricted to the registrar, school leadership and authorised administrators.");
      return;
    }
    if (!panel) return alert("Student registration form is unavailable. Please refresh the portal.");
    panel.hidden = false;
    if ($("newStudentAdmission") && !$("newStudentAdmission").value) $("newStudentAdmission").value = new Date().toLocaleDateString("en-CA",{timeZone:"Africa/Kampala"});
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
      const admissionDate = $("newStudentAdmission").value; const dob = $("newStudentDob").value; if (dob && admissionDate && dob > admissionDate) { $("studentCreateMsg").textContent = "Date of birth cannot be later than the admission date."; return; } const payload = { first_name:first, middle_name:middle || null, last_name:last, student_no:code, sex:$("newStudentSex").value || null, date_of_birth:dob || null, admission_date:admissionDate, status:$("newStudentStatus").value, address:$("newStudentAddress").value.trim() || null, photo_url:$("newStudentPhoto").value.trim() || null, medical_notes:$("newStudentMedical").value.trim() || null,
        guardian_name:$("newGuardianName").value.trim() || null,
        guardian_relationship:$("newGuardianRelationship").value || null,
        guardian_phone:$("newGuardianPhone").value.trim() || null,
        guardian_alt_phone:$("newGuardianAltPhone").value.trim() || null,
        guardian_email:$("newGuardianEmail").value.trim() || null,
        guardian_address:$("newGuardianAddress").value.trim() || null,
        father_name:$("newFatherName").value.trim() || null,
        father_phone:$("newFatherPhone").value.trim() || null,
        mother_name:$("newMotherName").value.trim() || null,
        mother_phone:$("newMotherPhone").value.trim() || null,
        emergency_contact_name:$("newEmergencyName").value.trim() || null,
        emergency_contact_relationship:$("newEmergencyRelationship").value.trim() || null,
        emergency_contact_phone:$("newEmergencyPhone").value.trim() || null,
        former_school:$("newFormerSchool").value.trim() || null,
        former_school_address:$("newFormerSchoolAddress").value.trim() || null,
        former_school_contact:$("newFormerSchoolContact").value.trim() || null,
        previous_class:$("newPreviousClass").value.trim() || null,
        last_school_year:$("newLastSchoolYear").value.trim() || null,
        transfer_certificate_no:$("newTransferCertificate").value.trim() || null,
        boarding_status:$("newBoardingStatus").value || null,
        transport_details:$("newTransportDetails").value.trim() || null };
      const r = await db.from("students").insert(payload);
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