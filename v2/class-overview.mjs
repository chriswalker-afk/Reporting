/** Class register columns and filters. Values are projections, never stored summary data. */
export const GROUPS=[
 {id:'identity',label:'Identity & flags',columns:[['tutorGroupId','TG','tutor'],['flags','Flags','flags']]},
 {id:'attainment',label:'Attainment',columns:[['average','Avg %','studentAverage'],['grade','Grade','overallGrade']]},
 {id:'latest',label:'Latest result',columns:[['latestPercent','Latest','latest']]},
 {id:'targets',label:'Targets',columns:[['minimumGrade','MTG','minimumTarget'],['predictedGrade','Pred.','predicted'],['gapToTarget','Δ MTG','target'],['nextGradePoints','Next grade','nextGrade']]},
 {id:'support',label:'Support',columns:[['wave','SOC / wave','soc'],['noteCount','Comments','comments']]},
 {id:'detail',label:'Extra detail',columns:[['house','House'],['coverageCount','Results','resultCoverage'],['latestTitle','Latest assessment','latest'],['gapToPrediction','Δ pred.','predictionGap'],['track','Status','target']]}
];
export const DEFAULT_GROUPS=GROUPS.filter(g=>g.id!=='detail').map(g=>g.id);
export const registerColumns=groups=>[['name','Student'],...GROUPS.filter(g=>(groups??DEFAULT_GROUPS).includes(g.id)).flatMap(g=>g.columns)];
export function projectRegisterRow(summary,student,{cases,subjectCases,notes,grades,editable,targetEditable,canComment}){
 const rank=label=>label===null||label===undefined?null:grades.includes(label)?grades.indexOf(label):null;
 const soc=cases.length>0;
 return {...student,...summary,id:summary.enrolmentId,name:student.name,
   flags:[...student.tags,...(soc?['SOC']:[])],soc,active:subjectCases,
   wave:subjectCases.length?Math.max(...subjectCases.map(c=>c.wave)):0,
   visibleCases:cases,notes,noteCount:notes.length,editable,targetEditable,canComment,
   gradeRank:rank(summary.grade),minimumGradeRank:rank(summary.minimumGrade),predictedGradeRank:rank(summary.predictedGrade),
   latestPercent:summary.latest?.percent??null,latestGrade:summary.latest?.grade??null,
   latestTitle:summary.latest?.title??null,latestDate:summary.latest?.date??null,
   nextGradePoints:summary.nextGrade?.percentagePoints??null,nextGradeLabel:summary.nextGrade?.grade??null,
   coverageCount:summary.coverage.scored,track:summary.onTrack===null?'Unknown':summary.onTrack?'On track':'Below target'};
}
export function filterRegister(rows,state,matchText){
 return rows.filter(p=>matchText(state.query,p.name,p.tutorGroupId,p.house,p.flags??p.tags)&&
  (!state.flag||state.flag==='all'||(p.flags??p.tags).includes(state.flag))&&
  (!state.tutorFilter||state.tutorFilter==='all'||p.tutorGroupId===state.tutorFilter)&&
  (!state.houseFilter||state.houseFilter==='all'||p.house===state.houseFilter)&&
  (!state.below||p.gapToTarget!==null&&p.gapToTarget<0)&&
  (!state.trackFilter||state.trackFilter==='all'||state.trackFilter==='below'&&p.onTrack===false||
    state.trackFilter==='on'&&p.onTrack===true||state.trackFilter==='unknown'&&p.onTrack===null)&&
  (!state.supportFilter||state.supportFilter==='all'||state.supportFilter==='soc'&&p.soc||
    state.supportFilter==='none'&&!p.soc||state.supportFilter==='w'+p.wave&&p.wave>0));
}
export const sortValue=(row,key)=>{
 const ranks={grade:'gradeRank',minimumGrade:'minimumGradeRank',predictedGrade:'predictedGradeRank'};
 return ranks[key]&&Object.hasOwn(row,ranks[key])?row[ranks[key]]:key==='flags'?row.tags?.join(', '):key==='wave'?row.wave||Number(row.soc)*.5:row[key];
};
