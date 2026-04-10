export default function AgreementPage() {
  return (
    <main className="storybook-scene min-h-screen px-4 py-10 sm:px-6 lg:px-8">
      <section className="mx-auto max-w-4xl rounded-[2rem] border-2 border-[#F0C95C] bg-[linear-gradient(180deg,rgba(255,255,247,0.97),rgba(255,255,255,0.92))] p-6 shadow-[0_18px_36px_rgba(255,193,7,0.12)] sm:p-8">
        <p className="math-chip-warning">用户协议</p>
        <h1 className="mt-4 font-math-display text-4xl font-extrabold text-ink">
          爱因数学星球用户协议
        </h1>
        <div className="mt-6 space-y-5 text-sm leading-8 text-slate-600 sm:text-base">
          <p>
            欢迎使用爱因数学星球。本平台为小学数学学习、教学管理与系统运营提供统一服务入口。注册或登录平台，即视为你已了解并同意按照本协议使用相关服务。
          </p>
          <p>
            学生账号可用于练习闯关、AI讲题、错题复习与学习报告查看；教师账号用于班级概览、学生进度与学情分析；管理员账号由系统后台创建并用于平台维护。
          </p>
          <p>
            用户应保证注册信息真实、完整、有效，不得冒用他人身份或提交虚假资料。教师账号可能需要经过审核后方可激活使用。
          </p>
          <p>
            平台会采取合理的技术与管理措施保护账号安全。请妥善保管密码与登录信息；如发现账号异常，请及时联系平台客服或学校管理员。
          </p>
        </div>
      </section>
    </main>
  );
}
