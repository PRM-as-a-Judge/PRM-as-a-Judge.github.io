(function(){
  var trajectories=Array.isArray(window.PRM_TRAJECTORIES)?window.PRM_TRAJECTORIES:[];
  var environments=[
    {key:'sim',label:'RoboDojo-Sim',benchmark:'RoboDojo-Sim'},
    {key:'realworld',label:'RoboDojo-RealWorld',benchmark:'RoboDojo-RealWorld'}
  ];
  var currentEnvironment=environments[0].key,currentCase=null,rows=[],chart=null;
  var COLOR_RISE='rgba(129, 199, 132, 0.9)';
  var COLOR_FALL='rgba(239, 83, 80, 0.9)';
  var COLOR_STALL='rgba(170, 155, 106, 0.9)';
  var COLOR_CURSOR='#2f5fa7';
  var COLOR_REFERENCE='rgba(143, 157, 178, 0.55)';
  var video=document.getElementById('case-video');
  var slider=document.getElementById('case-slider');
  var play=document.getElementById('play-btn');
  var tabs=document.getElementById('case-tabs');
  var select=document.getElementById('case-select');


  function fmt(t){
    t=Math.max(0,Math.round(t||0));
    return Math.floor(t/60)+':'+String(t%60).padStart(2,'0');
  }

  function pct(v){
    return Number.isFinite(v)?(v*100).toFixed(1):'\u2014';
  }

  function environmentFor(key){
    return environments.find(function(item){return item.key===key;})||environments[0];
  }

  function casesFor(key){
    var benchmark=environmentFor(key).benchmark;
    return trajectories.filter(function(c){return c.benchmark===benchmark;}).sort(function(a,b){
      return a.model.localeCompare(b.model)||a.task_name.localeCompare(b.task_name)||a.index-b.index;
    });
  }

  function isSuccessfulRollout(item){
    return !!(item&&item.metrics&&Number(item.metrics.SR)===1);
  }

  function getPhaseName(progress){
    if(progress<0.25)return 'Initialization';
    if(progress<0.5)return 'Approach';
    if(progress<0.75)return 'Manipulation';
    return 'Finishing';
  }

  function drawdown(values){
    if(!values.length)return null;
    var peak=values[0]||0,maxLoss=0,trough=0;
    values.forEach(function(v,i){
      peak=Math.max(peak,v);
      var loss=peak-v;
      if(loss>maxLoss){maxLoss=loss;trough=i;}
    });
    if(maxLoss<=0)return null;
    var bestAfter=Math.max.apply(null,values.slice(trough));
    return {
      ratio:Math.min(1,Math.max(0,(bestAfter-values[trough])/maxLoss)),
      loss:maxLoss
    };
  }

  function prefixMetrics(values,fullCase,isFinal){
    var mp=Math.max.apply(null,values);
    var tv=Math.abs(values[0]||0);
    var peak=values[0]||0,regret=0;
    var stagnant=Math.abs(values[0]||0)<0.005?1:0;
    for(var i=0;i<values.length;i++){
      peak=Math.max(peak,values[i]);
      regret+=peak-values[i];
      if(i>0){
        tv+=Math.abs(values[i]-values[i-1]);
        if(Math.abs(values[i]-values[i-1])<0.005)stagnant++;
      }
    }
    var ppl=tv>0?Math.min(1,mp*mp/tv):0;
    var cra=values.length?regret/values.length:0;
    var str=values.length?stagnant/values.length:0;
    var m50=mp>=0.5?1:0,m75=mp>=0.75?1:0;
    var dd=drawdown(values);
    var drr=dd?dd.ratio:null;

    if(isFinal&&fullCase.metrics){
      mp=Number(fullCase.metrics.MaxP);
      ppl=Number(fullCase.metrics.PPL);
      cra=Number(fullCase.metrics.CRA);
      str=Number(fullCase.metrics.Stag);
      m50=Number(fullCase.metrics.M50);
      m75=Number(fullCase.metrics.M75);
      drr=Number(fullCase.metrics.MDD)>0?Number(fullCase.metrics.DRR):null;
    }

    return {
      mp:mp,
      ppl:ppl,
      cra:cra,
      str:str,
      fns:0.5*mp+0.3*m75+0.2*m50,
      drr:drr,
      sqs:0.5*ppl+0.3*(1-cra)+0.2*(1-str)
    };
  }

  function diagnosisFor(state,metrics){
    if(state==='Stagnating'){
      return 'Diagnosis: stagnation dominates (STR='+metrics.str.toFixed(3)+'), suggesting limited state-transition efficiency.';
    }
    if(state==='Regressing'){
      return 'Diagnosis: regression pressure is visible (CRA='+metrics.cra.toFixed(3)+'), indicating unstable correction loops.';
    }
    if(metrics.ppl>0.72){
      return 'Diagnosis: the trajectory prefix is efficient and mostly monotonic (PPL='+metrics.ppl.toFixed(3)+').';
    }
    return 'Diagnosis: mixed dynamics with alternating gains and stalls; inspect local transitions for attribution.';
  }

  function appendSegment(target,a,b){
    if(target.length)target.push([null,null]);
    target.push(a,b);
  }

  function buildSegments(points){
    var segments={rise:[],fall:[],stall:[]};
    for(var i=0;i<points.length-1;i++){
      var a=points[i],b=points[i+1],delta=b[1]-a[1];
      if(delta>0.005)appendSegment(segments.rise,a,b);
      else if(delta<-0.005)appendSegment(segments.fall,a,b);
      else appendSegment(segments.stall,a,b);
    }
    return segments;
  }

  function update(p){
    if(!rows.length||!currentCase)return;
    var idx=Math.min(rows.length-1,Math.max(0,Math.round(p/100*(rows.length-1))));
    var currentValue=rows[idx];
    var prefix=rows.slice(0,idx+1);
    var finalState=idx===rows.length-1;
    var metrics=prefixMetrics(prefix,currentCase,finalState);
    var success=isSuccessfulRollout(currentCase);

    document.getElementById('m-progress').textContent=pct(currentValue);
    document.getElementById('m-mp').textContent=pct(metrics.mp);
    document.getElementById('m-ppl').textContent=pct(metrics.ppl);
    document.getElementById('m-cra').textContent=pct(metrics.cra);
    document.getElementById('m-str').textContent=pct(metrics.str);
    document.getElementById('m-fns').textContent=success?'\u2014':pct(metrics.fns);
    document.getElementById('m-drr').textContent=metrics.drr===null?'\u2014':pct(metrics.drr);
    document.getElementById('m-sqs').textContent=success?pct(metrics.sqs):'\u2014';

    document.querySelectorAll('.mc-milestone').forEach(function(m){
      m.classList.toggle('reached',metrics.mp*100>=Number(m.dataset.pct));
    });

    var prev=idx?rows[idx-1]:currentValue;
    var delta=currentValue-prev;
    var state=delta>0.005?'Progressing':delta<-0.005?'Regressing':'Stagnating';
    var chip=document.getElementById('progress-state-chip');
    chip.textContent=state;
    chip.className='curve-state-chip '+(state==='Progressing'?'state-rise':state==='Regressing'?'state-fall':'state-stall');
    document.getElementById('progress-state').textContent='Sample '+(idx+1)+' of '+rows.length;
    document.getElementById('frame-interpretation').textContent=
      'Frame summary: '+getPhaseName(currentValue)+' phase, \u03A6='+currentValue.toFixed(3)+', MP='+metrics.mp.toFixed(3)+'.';
    document.getElementById('diagnosis-hint').textContent=diagnosisFor(state,metrics);

    if(chart){
      var duration=video.duration||rows.length;
      var denominator=Math.max(1,rows.length-1);
      var full=rows.map(function(v,i){return [i/denominator*duration,v];});
      var active=full.slice(0,idx+1);
      var segments=buildSegments(active);
      var cursorTime=idx/denominator*duration;
      chart.setOption({series:[
        {id:'full-path',data:full},
        {id:'cursor-line',data:[[cursorTime,0],[cursorTime,1]]},
        {id:'rise-path',data:segments.rise},
        {id:'fall-path',data:segments.fall},
        {id:'stall-path',data:segments.stall},
        {id:'cursor-point',data:[[cursorTime,currentValue]]}
      ]});
    }
  }

  function initChart(){
    if(!window.echarts||!rows.length)return;
    chart=echarts.init(document.getElementById('case-chart'));
    chart.setOption({
      animation:false,
      grid:{left:'10%',right:'4%',top:'10%',bottom:'15%'},
      xAxis:{type:'value',name:'Time (s)',min:0,max:video.duration||rows.length,axisLine:{lineStyle:{color:'#c7d0dd'}},axisLabel:{color:'#667084'},splitLine:{show:false}},
      yAxis:{type:'value',name:'\u03A6(x_t)',min:0,max:1,axisLine:{lineStyle:{color:'#c7d0dd'}},axisLabel:{color:'#667084'},splitLine:{lineStyle:{color:'#e8edf4',type:'dashed'}}},
      series:[
        {id:'full-path',type:'line',smooth:true,symbol:'none',lineStyle:{color:COLOR_REFERENCE,type:'dashed',width:1.4},z:1},
        {id:'cursor-line',type:'line',data:[[0,0],[0,1]],symbol:'none',lineStyle:{color:'rgba(47,95,167,.65)',type:'dashed',width:1.4},animation:false,z:4,emphasis:{disabled:true}},
        {id:'rise-path',type:'line',smooth:true,connectNulls:false,symbol:'none',lineStyle:{color:COLOR_RISE,width:2.4},areaStyle:{color:'rgba(129,199,132,.22)'},z:3},
        {id:'fall-path',type:'line',smooth:true,connectNulls:false,symbol:'none',lineStyle:{color:COLOR_FALL,width:2.4},areaStyle:{color:'rgba(239,83,80,.22)'},z:3},
        {id:'stall-path',type:'line',smooth:true,connectNulls:false,symbol:'none',lineStyle:{color:COLOR_STALL,type:'dashed',width:1.8},z:2},
        {id:'cursor-point',type:'scatter',symbolSize:10,itemStyle:{color:COLOR_CURSOR,borderColor:'#fff',borderWidth:2},z:6}
      ]
    });
  }

  function caseOptionLabel(c){
    return c.model+' \u2014 '+c.task_name;
  }

  function loadCase(id){
    var selected=trajectories.find(function(c){return c.id===id;});
    if(!selected)return;
    currentCase=selected;
    rows=(selected.progress||[]).map(Number).filter(Number.isFinite);
    select.value=selected.id;
    slider.value=0;
    document.getElementById('timeline-percent').textContent='0%';
    document.getElementById('progress-fill').style.width='0%';


    document.getElementById('case-description').textContent=selected.benchmark+' \u00B7 '+selected.model+' \u00B7 '+selected.task_name;
    document.getElementById('summary-note').textContent='Values are shown on a 0\u2013100 scale; packaged final metrics appear at the end of the timeline.';

    video.pause();
    play.textContent='\u25B6';
    video.src=selected.video;
    video.load();
    if(chart){chart.dispose();chart=null;}
    initChart();
    update(0);
  }

  function setEnvironment(key){
    currentEnvironment=key;
    tabs.querySelectorAll('.selector-btn').forEach(function(button){
      var active=button.dataset.environment===key;
      button.classList.toggle('active',active);
      button.classList.toggle('selector-btn-filled',active);
      button.classList.toggle('selector-btn-outline',!active);
    });
    var environmentCases=casesFor(key);
    select.innerHTML='';
    environmentCases.forEach(function(c){
      var option=document.createElement('option');
      option.value=c.id;
      option.textContent=caseOptionLabel(c);
      select.appendChild(option);
    });

    if(environmentCases.length)loadCase(environmentCases[0].id);
  }

  function buildTabs(){
    tabs.innerHTML='';
    environments.forEach(function(environment){
      var button=document.createElement('button');
      button.type='button';
      button.className='selector-btn selector-btn-outline';
      button.dataset.environment=environment.key;
      button.textContent=environment.label;
      button.addEventListener('click',function(){setEnvironment(environment.key);});
      tabs.appendChild(button);
    });
  }

  select.addEventListener('change',function(){loadCase(this.value);});
  video.addEventListener('loadedmetadata',function(){
    document.getElementById('ctrl-time').textContent='0:00 / '+fmt(video.duration);
    document.getElementById('case-time').textContent='0:00 / '+fmt(video.duration);
    if(chart){chart.dispose();chart=null;}
    initChart();
    update(Number(slider.value));
  });
  video.addEventListener('timeupdate',function(){
    if(!video.duration)return;
    var p=video.currentTime/video.duration*100;
    slider.value=p;
    document.getElementById('ctrl-time').textContent=fmt(video.currentTime)+' / '+fmt(video.duration);
    document.getElementById('case-time').textContent=fmt(video.currentTime)+' / '+fmt(video.duration);
    document.getElementById('timeline-percent').textContent=Math.round(p)+'%';
    document.getElementById('progress-fill').style.width=p+'%';
    update(p);
  });
  slider.addEventListener('input',function(){
    var p=Number(slider.value);
    if(video.duration)video.currentTime=p/100*video.duration;
    document.getElementById('timeline-percent').textContent=Math.round(p)+'%';
    document.getElementById('progress-fill').style.width=p+'%';
    update(p);
  });
  play.addEventListener('click',function(){if(video.paused)video.play();else video.pause();});
  video.addEventListener('play',function(){play.textContent='\u2161';});
  video.addEventListener('pause',function(){play.textContent='\u25B6';});
  document.getElementById('progress-wrap').addEventListener('click',function(e){
    if(!video.duration)return;
    var rect=this.getBoundingClientRect();
    video.currentTime=(e.clientX-rect.left)/rect.width*video.duration;
  });
  document.getElementById('mute-btn').addEventListener('click',function(){
    video.muted=!video.muted;
    this.textContent=video.muted?'\uD83D\uDD07':'\uD83D\uDD0A';
  });
  document.getElementById('vol-slider').addEventListener('input',function(){video.volume=Number(this.value)/100;});
  window.addEventListener('resize',function(){if(chart)chart.resize();});

  window.PRM_EXPLORER={setEnvironment:setEnvironment,loadCase:loadCase};

  if(!trajectories.length){
    document.getElementById('case-description').textContent='Trajectory data could not be loaded.';
    return;
  }
  buildTabs();
  var requestedEnvironment=new URLSearchParams(window.location.search).get('trajectoryEnvironment');
  setEnvironment(environments.some(function(item){return item.key===requestedEnvironment;})?requestedEnvironment:environments[0].key);
})();
