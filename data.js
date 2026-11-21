(function buildDemoData() {
  'use strict';
  const roster = [
    ['S001','Sofia Rahman',11,'11MA1','11A',76,68,'On track','Debate Club'],
    ['S002','Daniel Tan',11,'11MA1','11B',61,70,'Review','Badminton'],
    ['S003','Maya Patel',11,'11MA1','11C',88,85,'On track','Orchestra'],
    ['S004','Noah Williams',11,'11MA1','11A',55,65,'Review','Football'],
    ['S005','Zara Lim',11,'11MA1','11B',79,75,'On track','Art Studio'],
    ['S006','Oliver Chen',11,'11MA1','11A',72,71,'On track','Robotics'],
    ['S007','Imani Brooks',12,'12MA1','12D',84,80,'On track','Volunteering'],
    ['S008','Yusuf Malik',12,'12MA1','12E',63,72,'Review','Basketball'],
    ['S009','Ella Wong',12,'12MA1','12F',77,75,'On track','Choir'],
    ['S010','Ethan Reed',12,'12MA1','12D',74,76,'On track','Robotics'],
    ['S011','Leila Ahmed',10,'10MA2','10B',67,74,'Review','Netball'],
    ['S012','Isaac Brown',10,'10MA2','10C',71,68,'On track','Chess'],
    ['S013','Hana Park',10,'10MA2','10A',90,87,'On track','Orchestra'],
    ['S014','Leo Martin',10,'10MA2','10D',58,69,'Review','Volleyball'],
    ['S015','Nila Das',10,'10MA2','10B',81,78,'On track','Art Studio'],
    ['S016','Mia Roberts',11,'11MA1','11B',69,68,'On track','Swimming']
  ];
  const bound = value => Math.max(45,Math.min(96,value));
  const students = roster.map(([id,name,year,classId,form,score,previous,status,cca],index)=>({
    id,name,year,classId,form,score,previous,status,cca,
    initials:name.split(' ').map(part=>part[0]).join(''),
    attendance: 93 + (index % 6),
    target: score>=80?'8':score>=70?'7':score>=60?'6':'5',
    grade:score>=85?'8':score>=75?'7':score>=65?'6':score>=55?'5':'4',
    subjects:[
      {name:'Mathematics',latest:score,previous},
      {name:'English',latest:bound(score+5-(index%4)*2),previous:bound(previous+2)},
      {name:'Science',latest:bound(score-2+(index%5)*3),previous:bound(previous-1)}
    ],
    assessments:[
      {name:'November checkpoint',date:'18 Nov 2026',score,topic:'Mixed assessment'},
      {name:'October topic check',date:'21 Oct 2026',score:previous,topic:'Algebra and problem solving'},
      {name:'September baseline',date:'16 Sep 2026',score:bound(previous-4),topic:'Prior knowledge'}
    ],
    ccaAttendance:`${7+(index%3)}/9 sessions`,
    ptm:index%3===0?'Booked · 26 Nov':'Availability pending'
  }));
  const classes = [
    {id:'11MA1',name:'Year 11 Mathematics',shortName:'Y11 Maths',room:'T11',next:'08:00',course:'IGCSE Higher',color:'teal'},
    {id:'12MA1',name:'Year 12 Mathematics',shortName:'Y12 Maths',room:'T12',next:'10:20',course:'A level Mathematics',color:'blue'},
    {id:'10MA2',name:'Year 10 Mathematics',shortName:'Y10 Maths',room:'T11',next:'13:10',course:'IGCSE Higher',color:'lavender'}
  ];
  const tasks = [
    {id:'T001',title:'Review Year 11 assessment analysis',category:'Academic review',detail:'Compare November checkpoint results and identify targeted support.',due:'Today',priority:'high',classId:'11MA1',status:'Open',assignee:'Sam Taylor',roles:['faculty','teacher','senior']},
    {id:'T002',title:'Follow up on Daniel’s algebra support',category:'Student support',detail:'Check whether the algebra intervention is improving assessment performance.',due:'Today',priority:'medium',studentId:'S002',status:'Open',assignee:'Sam Taylor',roles:['faculty','teacher','pastoral','senior']},
    {id:'T003',title:'Submit Year 11 PTM availability',category:'Parent meetings',detail:'Confirm available slots before booking opens to families.',due:'Thu 26 Nov',priority:'medium',status:'Open',assignee:'Sam Taylor',roles:['faculty','teacher','pastoral','senior']},
    {id:'T004',title:'Review Year 10 follow-up actions',category:'Pastoral',detail:'Review progress against open support actions for selected pupils.',due:'This week',priority:'medium',studentId:'S011',status:'Open',assignee:'Year Team',roles:['pastoral','senior']},
    {id:'T005',title:'Complete faculty examination review',category:'Exams & data',detail:'Confirm key strengths, gaps and recommendations from the latest assessment cycle.',due:'This week',priority:'low',status:'Open',assignee:'Sam Taylor',roles:['faculty','senior']},
    {id:'T006',title:'Confirm CCA attendance register',category:'Co-curricular',detail:'Check club registrations and record an attendance register.',due:'Tomorrow',priority:'low',status:'Open',assignee:'Sam Taylor',roles:['faculty','teacher','pastoral','senior']}
  ];
  const interventions = {
    S002:[{title:'Algebra support',description:'Short, focused practice after the November checkpoint.',owner:'Maths Faculty',date:'16 Nov',status:'Active'}],
    S004:[{title:'Problem-solving check-in',description:'Review the strategy used for multi-step questions.',owner:'Class teacher',date:'14 Nov',status:'Active'}],
    S008:[{title:'Pure maths catch-up',description:'Weekly practice on algebraic manipulation and graphs.',owner:'Maths Faculty',date:'17 Nov',status:'Active'}],
    S011:[{title:'Progress monitoring',description:'Review effort and assessment outcomes at the next check-in.',owner:'Year team',date:'12 Nov',status:'Active'}]
  };
  const messages = {
    S002:[{author:'Ms Chen',initials:'MC',date:'18 Nov',text:'Daniel has attended the first support session. We will review his next short assessment.'}],
    S004:[{author:'Sam Taylor',initials:'ST',date:'17 Nov',text:'Please keep the follow-up brief and review the next checkpoint.'}]
  };
  const notes = {
    S002:[{title:'Checkpoint observation',body:'Algebra accuracy is below the target. A short practice sequence has been agreed.',author:'Sam Taylor',date:'18 Nov',audience:'Relevant academic staff'}]
  };
  const resources = [
    {id:'assessment',title:'Assessment & reporting',category:'Academic',summary:'Reporting cycles, assessment guidance and moderation.',body:'This is placeholder policy text for the design prototype. In a real implementation, this section would link to an approved, version-controlled school policy.'},
    {id:'staff',title:'Staff handbook',category:'Staff',summary:'Everyday procedures, contacts and responsibilities.',body:'Illustrative information only. The production system should display approved current documents, ownership, review dates and search results.'},
    {id:'parents',title:'Parent information',category:'Families',summary:'Term dates, key events and common questions.',body:'Illustrative parent guidance. In production this may draw from existing school-approved sources rather than maintaining duplicate copies.'},
    {id:'homework',title:'Homework guidance',category:'Teaching',summary:'Expectations, deadlines and submission support.',body:'Sample content only. Homework integration would require a separate discovery and permissions phase.'},
    {id:'cca',title:'CCA procedures',category:'Activities',summary:'Registration, attendance and activity arrangements.',body:'Illustrative CCA procedures. Any integration with SchoolsBuddy would be subject to school and vendor approval.'},
    {id:'exams',title:'Year-end examinations',category:'Examinations',summary:'Exam administration, analysis and department review.',body:'Prototype content. Live markbooks, exam reports and data-analysis workflows should only be added after a formal data governance review.'}
  ];
  const events = [
    {id:'e1',day:'26',month:'NOV',title:'Year 11 parent-teacher meetings',detail:'Availability collection · Demo event',action:'availability'},
    {id:'e2',day:'02',month:'DEC',title:'CCA registration review',detail:'Activity sign-ups and attendance · Demo event',action:'cca'},
    {id:'e3',day:'09',month:'DEC',title:'Academic review checkpoint',detail:'Progress and intervention evaluation · Demo event',action:'review'}
  ];
  window.SchoolHubData = {students,classes,tasks,interventions,messages,notes,resources,events};
})();
