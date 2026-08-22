-- ============================================================
-- سكريبت إعداد قاعدة بيانات تطبيق "الحديد"
-- شغّل هاد الملف كامل مرة وحدة من: Supabase Dashboard -> SQL Editor -> New query
-- ============================================================

-- جدول واحد بس: صف لكل مستخدم، وفيه عمودين JSON يخزنو
-- بالضبط نفس شكل البيانات اللي كان التطبيق يحطها بـ window.storage
create table if not exists app_data (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  schedule   jsonb not null default '[]',
  logs       jsonb not null default '{}',
  updated_at timestamptz not null default now()
);

-- تفعيل حماية على مستوى الصف (Row Level Security)
-- بدون هاد، أي حدا عنده مفتاح anon (وهو مفتاح عام أصلاً) يقدر يقرا/يعدل بيانات الكل
alter table app_data enable row level security;

-- كل مستخدم يقدر يشوف بياناته هو بس
create policy "select own app_data"
  on app_data for select
  using (auth.uid() = user_id);

-- كل مستخدم يقدر يعمل إدخال (insert) بس لصفه هو
create policy "insert own app_data"
  on app_data for insert
  with check (auth.uid() = user_id);

-- كل مستخدم يقدر يعدّل بياناته هو بس
create policy "update own app_data"
  on app_data for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ============================================================
-- ملاحظة مهمة جدًا (خطوة يدوية لازم تسويها بعد تشغيل هاد السكريبت):
-- روح لـ Authentication -> Providers -> Email بلوحة تحكم Supabase
-- ووقف خيار "Confirm email".
--
-- ليش؟ لأن التطبيق بيسجّل كل مستخدم بإيميل داخلي وهمي (مش إيميل حقيقي)
-- عشان يقدر يستخدم "اسم مستخدم" عادي بدل إيميل. لو خاصية تأكيد الإيميل
-- شغالة، Supabase بينتظر تأكيد ما رح يوصل أبدًا، والحساب بيضل معلّق.
-- ============================================================
