import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { Site, SitesResponse, SiteResponse } from '../models/Site';
import { AuthenticationService } from './authentication.service';
import { HttpClient, HttpParams } from '@angular/common/http';
import { environment } from 'src/environments/environment';
import { Headers, Loading } from '../models/Http';
import { map } from 'rxjs/operators';

@Injectable({
  providedIn: 'root',
})
export class SitesService {
  private sitesUrl: string;
  private _sites: BehaviorSubject<Site[]>;
  private store: SitesResponse;
  private headers: Headers;
  private currentSiteId: number;
  loading: Loading;

  constructor(
    private http: HttpClient,
    private authenticationService: AuthenticationService
  ) {
    this.sitesUrl = `${environment.api_url}/sites`;
    this._sites = <BehaviorSubject<Site[]>>new BehaviorSubject([]);
    this.store = { sites: [] };
    this.headers = {
      'Content-Type': 'application/json',
      Authorization: this.authenticationService.getAuthorizationHeader(),
    };
    this.loading = {
      bulk: false,
      single: false,
    };
  }

  /**
   * Getter for Sites
   */
  get sites(): Observable<Site[]> {
    return this._sites.asObservable();
  }

  get site(): Observable<Site> {
    this.loading.single = true;
    return this._sites.pipe(
      map((sites: Site[]) =>
        sites.find((site: Site) => {
          const condition = this.currentSiteId === site.id;
          if (condition) {
            this.loading.single = false;
          }
          return condition;
        })
      )
    );
  }

  /**
   * Load site by ID
   *
   * @param id number
   */
  load(id: number): void {
    this.loading.single = true;
    this.currentSiteId = id;
    this.http
      .get<SiteResponse>(this.sitesUrl + '/' + id, { headers: this.headers })
      .subscribe({
        next: (res: SiteResponse) => {
          let notFound = true;
          const newSite = res.site;
          this.store.sites.forEach((site: Site, index: number) => {
            if (site.id === newSite.id) {
              this.store.sites[index] = newSite;
              notFound = false;
            }
          });
          if (notFound) {
            this.store.sites.push(newSite);
          }

          this._sites.next(Object.assign({}, this.store).sites);
          this.loading.single = false;
        },
      });
  }

  /**
   * Load all (filtered by term) sites
   *
   * @param term string default ''
   */
  loadAll(term: string = ''): void {
    this.loading.bulk = true;
    const options = {
      headers: this.headers,
      params: new HttpParams().set('label', term.trim()),
    };

    this.http.get<SitesResponse>(this.sitesUrl, options).subscribe({
      next: (res: SitesResponse) => {
        this.store = res;
        this._sites.next(Object.assign({}, this.store).sites);
        this.loading.bulk = false;
      },
    });
  }
}
