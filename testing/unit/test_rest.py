import sys
sys.path.append("../..")
sys.path.append("..")
import slideatlas
import unittest

class APIv1_Tests(unittest.TestCase):
    def setUp(self):
        self.app1 = slideatlas.app
        self.app1.testing = True
        self.app = self.app1.test_client()

    def login(self):
        return self.app.post('/login.passwd', data=dict(
            username="all_demo",
            passwd=""
        ), follow_redirects=True)

    def logout(self):
        return self.app.get('/logout', follow_redirects=True)

    def testRestURLs(self):
        urls_to_pass = [  "/apiv1/5074589002e31023d4292d83/sessions",
                                    "/apiv1/5074589002e31023d4292d83/sessions/5074589002e31023d4292d83",
                                    "/apiv1/5074589002e31023d4292d83/sessions/5074589002e31023d4292d83/views",
                                    "/apiv1/5074589002e31023d4292d83/sessions/5074589002e31023d4292d83/views/5074589002e31023d4292d83",
                                    "/apiv1/5074589002e31023d4292d83/sessions/5074589002e31023d4292d83/attachments",
                                    "/apiv1/5074589002e31023d4292d83/sessions/5074589002e31023d4292d83/attachments/5074589002e31023d4292d83",
                                    "/apiv1/users/5074589002e31023d4292d83",
                                    "/apiv1/databases",
                                    "/apiv1/rules/5074589002e31023d4292d83"]

        urls_to_fail = ["/apiv1/somethingelse"]

        for aurl in urls_to_pass:
            print "Testing: ",
            rv = self.app.get(aurl)
            print rv.status_code, " ", aurl
            assert rv.status_code != 404

        # Now test for urls that should not pass
        for aurl in urls_to_fail:
            print "Testing failure of: ", aurl
            rv = self.app.get(aurl)
            assert rv.status_code == 404

    def testLoginWithUser(self):
        """ Any URL should not return without logging in
        """

        aurl = "/apiv1/5074589002e31023d4292d83/sessions/5074589002e31023d4292d83"
        aurl = "/apiv1/databases/5074589002e31023d4292d83"

        # expact 401
        rv = self.app.get(aurl)
        print "Before login: ", rv.status_code, " ", aurl
        assert rv.status_code == 401

        # expact 200
        self.login()
        rv = self.app.get(aurl)
        print "After login : ", rv.status_code, " ", aurl
        assert rv.status_code == 200




if __name__ == "__main__":
    unittest.main()
