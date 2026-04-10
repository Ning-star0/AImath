export default function PrivacyPage() {
  return (
    <main className="storybook-scene min-h-screen px-4 py-10 sm:px-6 lg:px-8">
      <section className="mx-auto max-w-4xl rounded-[2rem] border-2 border-[#F0C95C] bg-[linear-gradient(180deg,rgba(255,255,247,0.97),rgba(255,255,255,0.92))] p-6 shadow-[0_18px_36px_rgba(255,193,7,0.12)] sm:p-8">
        <p className="math-chip-warning">隐私政策</p>
        <h1 className="mt-4 font-math-display text-4xl font-extrabold text-ink">
          爱因数学星球隐私政策
        </h1>
        <div className="mt-6 space-y-5 text-sm leading-8 text-slate-600 sm:text-base">
          <p>
            我们重视每一位学生、教师与学校管理者的个人信息安全。平台仅在提供学习服务、身份识别、通知提醒与系统运营所必需的范围内收集和使用信息。
          </p>
          <p>
            学生注册信息主要用于学习身份识别与学习数据归档；教师信息用于审核、教学组织与班级服务；管理员账号仅在后台维护中使用。
          </p>
          <p>
            平台不会在未获授权的情况下向无关第三方披露个人信息，但法律法规另有规定或为履行教学服务所必须的情形除外。
          </p>
          <p>
            如需更正、更新或删除账号相关信息，可通过平台客服、学校管理员或系统管理后台发起申请。
          </p>
        </div>
      </section>
    </main>
  );
}
