import ast
from pathlib import Path

source=ast.parse((Path(__file__).resolve().parent.parent/'start_nbl_analyzer.py').read_text())
node=next(n for n in source.body if isinstance(n,ast.FunctionDef) and n.name=='fetch_motive_drivers')
calls=[]
def request(path,query):
    assert path=='/v1/users' and query['role']=='driver'
    calls.append(query.copy())
    status=query['status'];page=query['page_no']
    if status=='active' and page==1:
        # Count pagination by raw records, not by filtered driver rows.
        return {'users':[{'user':{'id':i,'role':'admin' if i<50 else 'driver','first_name':'Active','driver_company_id':str(i),'status':'active'}} for i in range(100)],'pagination':{'total':101}},None
    if status=='active':
        return {'users':[{'user':{'id':101,'role':'driver','status':'active'}}],'pagination':{'total':101}},None
    return {'users':[{'user':{'id':200,'role':'driver','first_name':'Inactive','driver_company_id':'200','status':'deactivated'}}],'pagination':{'total':1}},None
env={'motive_request':request,'unwrap_item':lambda x,key:x.get(key,x)}
exec(compile(ast.Module(body=[node],type_ignores=[]),'directory','exec'),env)
drivers=env['fetch_motive_drivers']()
assert len(drivers)==52 and any(d['status']=='deactivated' for d in drivers)
assert [(q['status'],q['page_no']) for q in calls]==[('active',1),('active',2),('deactivated',1)]
def malformed(path,query):return {'users':None},None
env['motive_request']=malformed
try:env['fetch_motive_drivers']();raise AssertionError('Malformed response was accepted')
except RuntimeError:pass
def denied(path,query):raise PermissionError('Users permission denied')
env['motive_request']=denied
try:env['fetch_motive_drivers']();raise AssertionError('Denied response was accepted')
except PermissionError:pass
print('PASS authoritative users endpoint, both account statuses, nested response, raw pagination, malformed and denied directory handling')
