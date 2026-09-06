export async function onRequestPost({ request }) {
  try {
    const body = await request.json();
    const quiz = body?.quiz;
    if (!quiz || typeof quiz !== 'object') {
      return Response.json({ ok:false, error:'A quiz object is required.' }, { status:400 });
    }
    const issues=[];
    if (!String(quiz.title ?? '').trim()) issues.push({level:'error',code:'TITLE_EMPTY',message:'Quiz title is empty.'});
    const questions=Array.isArray(quiz.questions)?quiz.questions:[];
    questions.forEach((q,i)=>{
      if (!String(q?.text ?? '').trim()) issues.push({level:'error',code:'PROMPT_EMPTY',index:i,message:`Question ${i+1} has no prompt.`});
      if (Number(q?.points ?? 0)<0) issues.push({level:'error',code:'NEGATIVE_POINTS',index:i,message:`Question ${i+1} has negative points.`});
      if (['multiple_choice','multiple_select','true_false','yes_no'].includes(q?.type)) {
        const opts=Array.isArray(q.options)?q.options:[];
        if (!opts.some(o=>o?.correct===true)) issues.push({level:'error',code:'NO_KEY',index:i,message:`Question ${i+1} has no answer key.`});
      }
    });
    return Response.json({ok:!issues.some(x=>x.level==='error'),issues,checkedAt:new Date().toISOString(),questionCount:questions.length});
  } catch (error) {
    return Response.json({ok:false,error:'Invalid JSON request.'},{status:400});
  }
}
