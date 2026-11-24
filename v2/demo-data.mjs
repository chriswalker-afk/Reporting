import {assertData,SCHEMA_VERSION} from './model.mjs';

/** Fixed, generated examples: never imported from school systems. */
export function createDemoData(){
  const data={schemaVersion:SCHEMA_VERSION,synthetic:true,academicYear:'2026-27',asOf:'2026-11-24',
    staff:[],faculties:[],houses:[],tutorGroups:[],students:[],subjects:[],gradeSchemes:[],
    courses:[],classes:[],enrolments:[],units:[],assessments:[],results:[],targets:[],
    notes:[],interventions:[],studyPlans:[],notices:[],deadlines:[],audit:[]};
  const add=(table,record)=>{data[table].push(record);return record;};
  const staff=(id,name,roles)=>add('staff',{id,name,roles});
  staff('sam','Sam Taylor (demo)',['teacher','faculty','tutor']);
  staff('jordan','Jordan Evans (demo)',['teacher','tutor']);
  staff('morgan','Morgan Lee (demo)',['teacher','house','tutor']);
  staff('priya','Priya Nair (demo)',['teacher','leadership']);
  staff('alex','Alex Chen (demo)',['teacher','faculty','tutor']);
  staff('imani','Imani Cole (demo)',['teacher','faculty','house']);
  staff('robin','Robin Park (demo)',['teacher','tutor','house']);
  staff('avery','Avery Reed (demo)',['leadership']);
  const specs=[
    {id:'maths',name:'Mathematics',faculty:'mathematics',head:'sam',teachers:['sam','jordan'],
      topics:['Number','Algebra','Geometry','Statistics']},
    {id:'science',name:'Science',faculty:'science',head:'alex',teachers:['alex','morgan'],
      topics:['Forces','Energy','Electricity','Materials']},
    {id:'english',name:'English',faculty:'english',head:'imani',teachers:['imani','priya'],
      topics:['Reading','Writing','Language','Literature']}
  ];
  for(const s of specs){
    add('faculties',{id:s.faculty,name:s.name,headIds:[s.head]});
    add('subjects',{id:s.id,name:s.name,facultyId:s.faculty});
  }
  for(const [id,name,head] of [['cedar','Cedar','imani'],['willow','Willow','morgan'],['oak','Oak','robin']])
    add('houses',{id,name,headIds:[head]});
  const scheme=(id,name,labels,mins)=>add('gradeSchemes',{id,name,
    bands:labels.map((grade,i)=>({grade,min:mins[i]})),illustrative:true});
  scheme('ks3','KS3 illustrative attainment',['Emerging','Developing','Secure','Extending'],[0,40,60,80]);
  scheme('igcse','IGCSE illustrative 9–1',['U','1','2','3','4','5','6','7','8','9'],[0,12,23,33,43,53,63,73,83,92]);
  scheme('alevel','A level illustrative A*–E',['U','E','D','C','B','A','A*'],[0,35,45,55,65,75,88]);
  scheme('ib','IB illustrative 7–1',['1','2','3','4','5','6','7'],[0,20,35,50,65,78,90]);
  const schemeById=id=>data.gradeSchemes.find(g=>g.id===id);
  const houseIds=['cedar','willow','oak'];
  const tutors=['sam','jordan','morgan','alex','robin'];
  for(let year=7;year<=13;year++){
    for(let g=0;g<3;g++){
      const id=String(year)+['A','B','C'][g];
      add('tutorGroups',{id,name:id,year,houseId:houseIds[g],tutorIds:[tutors[(year+g)%tutors.length]]});
    }
    // 30 pupils per year, three different subject classes per pupil.
    for(let i=0;i<30;i++){
      const serial=(year-7)*30+i+1, id='P'+String(serial).padStart(3,'0'),g=i%3;
      add('students',{id,name:'Demo Student '+String(serial).padStart(3,'0'),year,houseId:houseIds[g],
        tutorGroupId:String(year)+['A','B','C'][g],tags:[
          ...(serial%11===0?['EAL']:[]),...(serial%13===0?['SEN']:[]),
          ...(serial%17===0?['HLP']:[]),...(serial%19===0?['Access arrangements']:[])],
        information:{admissionNumber:'DEMO-'+serial,examNumber:null,catPredictors:null,ptm:null,pte:null}});
    }
    for(const [si,s] of specs.entries()){
      const courseId=year+'-'+s.id;
      const gradeSchemeId=year<=9?'ks3':year<=11?'igcse':s.id==='science'?'ib':'alevel';
      add('courses',{id:courseId,subjectId:s.id,year,academicYear:data.academicYear,
        name:(year<=9?'KS3':year<=11?'IGCSE':s.id==='science'?'IB':'A level')+' '+s.name,
        gradeSchemeId,defaultWeight:1});
      const classIds=[courseId+'-1',courseId+'-2'];
      for(let j=0;j<2;j++)add('classes',{id:classIds[j],courseId,name:'Y'+year+' '+s.name+' '+(j+1),
        code:year+s.id.slice(0,2).toUpperCase()+(j+1),teacherIds:[s.teachers[j]],room:'Demo '+(si+1)+'-'+(j+1)});
      const pupils=data.students.filter(p=>p.year===year);
      for(const [i,p] of pupils.entries()){
        const classId=classIds[(i+Math.floor(i/3)*si+si)%2];
        const enrolmentId=p.id+'@'+courseId;
        add('enrolments',{id:enrolmentId,studentId:p.id,classId});
        const grades=schemeById(gradeSchemeId).bands;
        const targetIndex=Math.max(1,grades.length-2-(i%3===0?1:0));
        const predictedIndex=Math.min(grades.length-1,Math.max(0,targetIndex+(i+si)%4-2));
        add('targets',{id:'T-'+enrolmentId,enrolmentId,minimumGrade:grades[targetIndex].grade,
          predictedGrade:i%7===0?null:grades[predictedIndex].grade});
      }
      const u1=courseId+'-U1',u2=courseId+'-U2';
      add('units',{id:u1,courseId,title:'Unit 1 · '+s.topics[0]+' and '+s.topics[1],order:1});
      add('units',{id:u2,courseId,title:'Unit 2 · '+s.topics[2]+' and '+s.topics[3],order:2});
      const items=[
        [{id:'total',label:'Total',maxMarks:40,topic:null,ao:null}],
        [{id:'t1',label:s.topics[0],maxMarks:20,topic:s.topics[0],ao:null},
         {id:'t2',label:s.topics[1],maxMarks:24,topic:s.topics[1],ao:null}],
        [{id:'q1',label:'Q1',maxMarks:6,topic:s.topics[2],ao:'AO1'},
         {id:'q2',label:'Q2',maxMarks:10,topic:s.topics[3],ao:'AO2'},
         {id:'q3',label:'Q3',maxMarks:14,topic:s.topics[2],ao:'AO3'}],
        [{id:'total',label:'Diagnostic total',maxMarks:20,topic:null,ao:null}],
        [{id:'total',label:'Total',maxMarks:30,topic:null,ao:null}]
      ];
      for(let k=0;k<5;k++){
        const a=add('assessments',{id:courseId+'-A'+(k+1),courseId,unitId:k<2?u1:u2,
          classIds:[...classIds],title:[s.topics[0]+' check',s.topics[1]+' topic test',s.topics[2]+' questions','Diagnostic check','Next assessment'][k],
          date:['2026-09-15','2026-10-08','2026-11-12','2026-11-20','2026-12-03'][k],
          gradeSchemeId,mode:['total','topics','questions','total','total'][k],
          items:items[k],weight:1,status:k===4?'draft':'published',
          includeInSummary:k!==3,exclusionReason:k===3?'Diagnostic only':null});
        if(k===4)continue;
        for(const [i,p] of pupils.entries()){
          const enrolmentId=p.id+'@'+courseId;
          const tag=(i+year*3+si*5+k*7);
          if(tag%29===0)continue; // no record = unentered
          const status=tag%23===0?'absent':tag%19===0?'missing':'present';
          const marks={};
          if(status==='present')for(const [q,item] of a.items.entries()){
            if(a.items.length>1&&tag%17===0&&q===a.items.length-1)continue;
            const base=35+(i*17+year*3+si*13+k*9+q*7)%62;
            marks[item.id]=tag%31===0?0:Math.round(item.maxMarks*base/100);
          }
          add('results',{id:'R-'+a.id+'-'+p.id,assessmentId:a.id,enrolmentId,status,marks,
            exclusionReason:status==='present'&&tag%27===0?'Demo: non-comparable sitting':null});
        }
      }
    }
  }
  const enrolment=(p,c)=>data.enrolments.find(e=>e.studentId===p&&data.classes.find(x=>x.id===e.classId).courseId===c);
  const makeCase=(id,p,c,state,wave,reviewDate)=>{
    const e=enrolment(p,c),classRecord=data.classes.find(x=>x.id===e.classId),owner=classRecord.teacherIds[0];
    const record=add('interventions',{id,enrolmentId:e.id,ownerStaffId:owner,state,wave,
      reason:'Demo academic support: consolidate prerequisite knowledge.',
      strategies:['Targeted practice','Review of worked examples'],
      openedDate:'2026-11-02',updatedDate:'2026-11-20',reviewDate,evaluation:state==='closed'?'Improved confidence in the practice tasks.':null,
      facultyPlan:wave>=2&&state!=='wave2_requested'?'Weekly subject support and a progress review.':null,
      houseRequest:wave>=2&&state!=='wave2_requested'?'Agree a study routine with the tutor.':null,
      houseResponse:null,leadershipPlan:state==='wave3'?'Coordinate a joint review.':null,
      history:[{actorStaffId:owner,date:'2026-11-02',text:'Fictional intervention opened.'}]});
    return record;
  };
  const c1=makeCase('I001','P121','11-maths','wave1',1,'2026-11-23');
  makeCase('I002','P121','11-science','wave2_requested',2,'2026-11-27');
  const c3=makeCase('I003','P126','11-maths','wave2',2,'2026-12-02');
  makeCase('I004','P151','12-maths','wave3_requested',3,'2026-11-26');
  makeCase('I005','P122','11-english','closed',1,'2026-11-19');
  for(const c of [c1,c3])add('studyPlans',{id:'SP-'+c.id,interventionId:c.id,ownerStaffId:c.ownerStaffId,
    target:'Complete and review two agreed practice tasks each week.',actions:['Teacher provides tasks','Student records completion'],reviewDate:c.reviewDate});
  add('notes',{id:'N001',enrolmentId:c1.enrolmentId,authorStaffId:c1.ownerStaffId,
    date:'2026-11-20',visibility:'subject',text:'Demo note: more independent work this week.'});
  add('notices',{id:'NO1',kind:'notice',title:'Demo staff notice',body:'Review upcoming assessment deadlines.',
    audience:{type:'all',id:null},authorStaffId:'avery',publishedDate:'2026-11-20',expiryDate:'2026-12-10',priority:'important',pinned:true,requiresAcknowledgement:true,version:1,acknowledgements:[],links:[]});
  add('notices',{id:'NO2',kind:'briefing',title:'Demo Week 12 briefing',body:'Check moderation and reporting arrangements.',
    audience:{type:'faculty',id:'mathematics'},authorStaffId:'sam',publishedDate:'2026-11-23',expiryDate:null,priority:'normal'});
  add('notices',{id:'NO3',kind:'briefing',title:'Demo previous briefing',body:'Earlier fictional teaching and learning reminders.',
    audience:{type:'all',id:null},authorStaffId:'avery',publishedDate:'2026-11-16',expiryDate:'2026-11-22',priority:'normal'});
  add('notices',{id:'NO4',kind:'notice',title:'Demo Willow House update',body:'Check tutor-group study routines.',
    audience:{type:'house',id:'willow'},authorStaffId:'morgan',publishedDate:'2026-11-23',expiryDate:'2026-12-05',priority:'normal'});
  add('deadlines',{id:'D1',title:'Demo Year 11 reporting deadline',event:'Reports',details:'Check and submit fictional reports in the approved reporting workflow.',dueDate:'2026-12-02',audience:{type:'year',id:11}});
  add('deadlines',{id:'D2',title:'Demo mathematics moderation',event:'Moderation',details:'Review the common assessment results.',dueDate:'2026-11-27',audience:{type:'faculty',id:'mathematics'}});
  add('deadlines',{id:'D3',title:'Demo Year 10 SIMS grades',event:'SIMS grades',details:'Review your fictional grade entries.',dueDate:'2026-11-23',audience:{type:'year',id:10}});
  return assertData(data);
}
