// Shared policy definitions, with legacy data retaining the existing method.
export const DEFAULT_METHOD='weighted-percentage';
export const METHODS=[
 {id:DEFAULT_METHOD,label:'Weighted percentages',description:'Average the assessment percentages using their individual weights. A 20-mark and a 100-mark test contribute equally if their weights match.'},
 {id:'equal-percentage',label:'Equal assessment percentages',description:'Give each complete assessment equal influence, regardless of its maximum mark or weight.'},
 {id:'weighted-marks',label:'Weighted total marks',description:'Divide the sum of earned marks times assessment weights by the sum of available marks times weights. Larger assessments contribute more.'},
 {id:'latest',label:'Most recent complete assessment',description:'Use the percentage from the latest eligible complete assessment only.'}
];
export const validMethod=id=>METHODS.some(m=>m.id===id);
export const methodLabel=id=>METHODS.find(m=>m.id===id)?.label??METHODS[0].label;
export function calculationFor(course,faculty){
 const method=course?.calculationMethod??faculty?.calculationMethod??DEFAULT_METHOD;
 return {method,source:course?.calculationMethod?'course':faculty?.calculationMethod?'faculty':'default'};
}
export const reportEvent=deadline=>['Reports','SIMS grades'].includes(deadline?.event);
export function reportApplies(deadline,course,facultyId,pupil){
 if(!reportEvent(deadline)||!course||!pupil)return false;
 const a=deadline.audience;
 return Boolean(a&&(a.type==='all'||a.type==='year'&&a.id===course.year||a.type==='faculty'&&a.id===facultyId||
  a.type==='house'&&a.id===pupil.houseId||a.type==='tutorGroup'&&a.id===pupil.tutorGroupId));
}
